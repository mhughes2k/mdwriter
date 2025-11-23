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
      throw new Error(`Failed to save document: ${err.message}`);
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
      throw new Error(`Failed to export document: ${err.message}`);
    }
  }

  /**
   * Validate document data against its schema
   */
  async validate(document) {
    console.log('[DocManager] Starting validation for type:', document.metadata.documentType);
    const typeName = document.metadata.documentType;
    const result = await this.schemaLoader.validate(typeName, document.data);
    console.log('[DocManager] Validation complete');
    return result;
  }

  /**
   * Add a comment to the document
   */
  addComment(document, comment, sectionPath = null) {
    if (!document.metadata.comments) {
      document.metadata.comments = [];
    }

    document.metadata.comments.push({
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      author: comment.author || 'Anonymous',
      text: comment.text,
      sectionPath,
      resolved: false
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
}

module.exports = DocumentManager;
