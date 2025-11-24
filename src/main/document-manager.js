const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Simple UUID v4 generator
function generateUUID() {
  return crypto.randomUUID();
}

class DocumentManager {
  constructor(schemaLoader) {
    this.schemaLoader = schemaLoader;
  }

  /**
   * Create a new document of the specified type
   */
  async createNew(typeName) {
    const docType = this.schemaLoader.getDocumentType(typeName);
    if (!docType) {
      throw new Error(`Unknown document type: ${typeName}`);
    }

    // Get schema to determine required fields
    const schema = await this.schemaLoader.loadSchema(typeName, docType.entrypoint);
    const required = schema.required || [];
    
    // Initialize document with required fields
    const documentData = {};
    required.forEach(field => {
      if (field === 'id') {
        documentData.id = generateUUID();
      } else {
        documentData[field] = '';
      }
    });

    return {
      metadata: {
        version: '1.0',
        documentType: typeName,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        author: '',
        renderOrder: null, // null means use default fieldOrder
        hiddenFields: [], // Fields to hide from preview
        activeTemplate: null, // Currently selected template for this document
        comments: [],
        sharedWith: [],
        editHistory: []
      },
      data: documentData
    };
  }

  /**
   * Load document from file (application file format with metadata)
   */
  async load(filePath) {
    try {
      console.log('[DocManager] Reading file:', filePath);
      const content = await fs.readFile(filePath, 'utf8');
      console.log('[DocManager] File read, parsing JSON...');
      const document = JSON.parse(content);
      console.log('[DocManager] JSON parsed successfully');
      
      // Check if it's our file format or just raw data
      if (document.metadata && document.data) {
        // Application file format
        console.log('[DocManager] Using application file format');
        return {
          filePath,
          ...document
        };
      } else {
        // Raw JSON document - infer type from file extension
        console.log('[DocManager] Raw format, inferring type from extension');
        const ext = path.extname(filePath).slice(1);
        const docType = Array.from(this.schemaLoader.documentTypes.values())
          .find(dt => dt.extensions.includes(ext));
        
        if (!docType) {
          throw new Error(`Could not determine document type from extension: ${ext}`);
        }

        // Wrap in our format
        console.log('[DocManager] Wrapping in application format');
        return {
          filePath,
          metadata: {
            version: '1.0',
            documentType: docType.name,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            author: '',
            renderOrder: null,
            hiddenFields: [],
            comments: [],
            sharedWith: [],
            editHistory: []
          },
          data: document
        };
      }
    } catch (err) {
      console.error('[DocManager] Error loading:', err);
      throw new Error(`Failed to load document: ${err.message}`);
    }
  }

  /**
   * Save document to file (application file format with metadata)
   */
  async save(filePath, document) {
    try {
      // Update modification timestamp
      document.metadata.modified = new Date().toISOString();
      
      // Add to edit history
      if (!document.metadata.editHistory) {
        document.metadata.editHistory = [];
      }
      document.metadata.editHistory.push({
        timestamp: new Date().toISOString(),
        action: 'save'
      });

      const content = JSON.stringify(document, null, 2);
      await fs.writeFile(filePath, content, 'utf8');
      
      return { success: true, filePath };
    } catch (err) {
      // Return structured error instead of throwing to match test expectations
      return { success: false, error: err.message };
    }
  }

  /**
   * Export document to clean JSON format (no metadata)
   */
  async exportClean(filePath, document) {
    try {
      const content = JSON.stringify(document.data, null, 2);
      await fs.writeFile(filePath, content, 'utf8');
      
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Validate document data against its schema
   */
  async validate(document) {
    console.log('[DocManager] Starting validation for type:', document.metadata.documentType);
    const typeName = document.metadata.documentType;
    const docType = this.schemaLoader.getDocumentType(typeName);
    if (!docType) {
      throw new Error('Unknown document type');
    }
    let result;
    // Prefer validateDocument when available (tests stub this method frequently)
    if (typeof this.schemaLoader.validateDocument === 'function') {
      if (docType && docType.entrypoint) {
        result = await this.schemaLoader.validateDocument(typeName, docType.entrypoint, document.data);
      } else {
        result = await this.schemaLoader.validateDocument(typeName, document.data);
      }
    } else if (typeof this.schemaLoader.validate === 'function') {
      result = await this.schemaLoader.validate(typeName, document.data);
    } else {
      throw new Error('No validation method available on schemaLoader');
    }
    console.log('[DocManager] Validation complete');
    return result;
  }

  /**
   * Add a comment to the document
   */
  addComment(document, text, fieldPath = null, author = 'Anonymous') {
    if (!document.metadata.comments) {
      document.metadata.comments = [];
    }
    document.metadata.comments.push({
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      author,
      text,
      fieldPath,
      resolved: false
    });
    return document;
  }

  async export(filePath, document) {
    return await this.exportClean(filePath, document);
  }

  shareWith(document, email, role) {
    if (!document.metadata.sharedWith) {
      document.metadata.sharedWith = [];
    }
    const existing = document.metadata.sharedWith.find(u => u.email === email);
    if (existing) {
      existing.role = role;
    } else {
      document.metadata.sharedWith.push({ email, role });
    }
    return document;
  }

  recordEdit(document, fieldPath, oldValue, newValue, author = 'Anonymous') {
    if (!document.metadata.editHistory) {
      document.metadata.editHistory = [];
    }
    document.metadata.editHistory.push({
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      fieldPath,
      oldValue,
      newValue,
      author
    });
    return document;
  }

  /**
   * Update a field in the document data
   */
  updateField(document, fieldPath, value) {
    const parts = fieldPath.split('.');
    let current = document.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    document.metadata.modified = new Date().toISOString();
    
    return document;
  }

  /**
   * Add an array item (e.g., learning outcome, assessment method)
   */
  addArrayItem(document, arrayPath, item) {
    const parts = arrayPath.split('.');
    let current = document.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    const arrayField = parts[parts.length - 1];
    if (!current[arrayField]) {
      current[arrayField] = [];
    }
    
    current[arrayField].push(item);
    document.metadata.modified = new Date().toISOString();
    
    return document;
  }

  /**
   * Remove an array item
   */
  removeArrayItem(document, arrayPath, index) {
    const parts = arrayPath.split('.');
    let current = document.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    
    const arrayField = parts[parts.length - 1];
    if (current[arrayField] && Array.isArray(current[arrayField])) {
      current[arrayField].splice(index, 1);
      document.metadata.modified = new Date().toISOString();
    }
    
    return document;
  }

  /**
   * Infer document type by validating against all registered types
   */
  async inferDocumentType(jsonData) {
    // Try to validate against each registered document type
    for (const [typeName, docType] of this.schemaLoader.documentTypes) {
      try {
        const validation = await this.schemaLoader.validate(typeName, jsonData);
        if (validation.valid) {
          console.log(`[DocManager] Inferred document type: ${typeName}`);
          return typeName;
        }
      } catch (err) {
        // Continue to next type if validation fails
        continue;
      }
    }
    return null;
  }

  /**
   * Import clean JSON data into a new or existing document
   */
  async importCleanJSON(filePath, existingDocument = null) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(content);

      let documentType;
      
      // If importing into existing document, use its type
      if (existingDocument) {
        documentType = existingDocument.metadata.documentType;
      } else {
        // Try to infer document type by validating against all types
        documentType = await this.inferDocumentType(jsonData);
        if (!documentType) {
          throw new Error('Unable to determine document type for the imported JSON. The data does not match any known document type schema.');
        }
      }

      // Validate JSON data against the schema
      const validation = await this.schemaLoader.validate(documentType, jsonData);
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => e.message || JSON.stringify(e)).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      // Wrap data in application format if creating a new document
      if (!existingDocument) {
        return {
          metadata: {
            version: '1.0',
            documentType,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            author: '',
            renderOrder: null,
            hiddenFields: [],
            activeTemplate: null,
            comments: [],
            sharedWith: [],
            editHistory: []
          },
          data: jsonData
        };
      }

      // Merge data into existing document
      existingDocument.data = jsonData;
      existingDocument.metadata.modified = new Date().toISOString();
      return existingDocument;
    } catch (err) {
      throw new Error(`Failed to import JSON: ${err.message}`);
    }
  }
}

module.exports = DocumentManager;
