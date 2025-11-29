/**
 * Schema Service
 * 
 * Manages schema loading and validation for the web server.
 * This is a server-side adaptation of the schema-loader from the main process.
 */

const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const ajvErrors = require('ajv-errors');

class SchemaService {
  constructor() {
    this.ajv = new Ajv({
      strict: false,
      validateSchema: false,
      validateFormats: true,
      allErrors: true
    });
    
    addFormats(this.ajv);
    ajvErrors(this.ajv);
    
    // Override format validators to allow empty strings
    const formats = ['uri', 'email', 'date', 'time', 'date-time', 'uri-reference', 'uri-template', 'hostname', 'ipv4', 'ipv6'];
    formats.forEach(formatName => {
      const originalFormat = this.ajv.formats[formatName];
      if (originalFormat) {
        this.ajv.addFormat(formatName, {
          validate: (value) => {
            if (value === '' || value == null) return true;
            if (typeof originalFormat === 'function') {
              return originalFormat(value);
            }
            if (originalFormat instanceof RegExp) {
              return originalFormat.test(value);
            }
            if (originalFormat && typeof originalFormat.validate === 'function') {
              return originalFormat.validate(value);
            }
            return true;
          }
        });
      }
    });
    
    this.schemaCache = new Map();
    this.validatorCache = new Map();
    this.documentTypes = new Map();
    this.modelsPath = path.join(__dirname, '../../../models');
  }

  /**
   * Initialize the schema service by loading all document types
   */
  async initialize() {
    await this.loadDocumentTypes();
    console.log(`[SchemaService] Loaded ${this.documentTypes.size} document types`);
  }

  /**
   * Load all document types from the models directory
   */
  async loadDocumentTypes() {
    try {
      const entries = await fs.readdir(this.modelsPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const typeName = entry.name;
          const metadataPath = path.join(this.modelsPath, typeName, `${typeName}.json`);
          
          try {
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            
            // Validate entrypoint exists
            if (metadata.entrypoint) {
              const entrypointPath = path.join(this.modelsPath, typeName, 'json-schema', metadata.entrypoint);
              try {
                await fs.access(entrypointPath);
              } catch (err) {
                console.warn(`[SchemaService] Skipping ${typeName}: entrypoint not found`);
                continue;
              }
            }
            
            this.documentTypes.set(typeName, {
              name: typeName,
              description: metadata.description,
              category: metadata.category || 'Other',
              icon: metadata.icon || '📄',
              extensions: metadata.extensions || [typeName],
              entrypoint: metadata.entrypoint,
              fieldOrder: metadata.fieldOrder || [],
              uiHints: metadata.uiHints || {},
              customForms: metadata.customForms || {},
              path: path.join(this.modelsPath, typeName, 'json-schema'),
              modelPath: path.join(this.modelsPath, typeName)
            });
            
            console.log(`[SchemaService] Loaded document type: ${typeName}`);
          } catch (err) {
            console.warn(`[SchemaService] Could not load ${typeName}:`, err.message);
          }
        }
      }
      
      return Array.from(this.documentTypes.values());
    } catch (err) {
      console.error('[SchemaService] Error loading document types:', err);
      return [];
    }
  }

  /**
   * Get all document types
   */
  getDocumentTypes() {
    return Array.from(this.documentTypes.values());
  }

  /**
   * Get a specific document type
   */
  getDocumentType(typeName) {
    return this.documentTypes.get(typeName) || null;
  }

  /**
   * Load a schema file
   */
  async loadSchema(typeName, schemaFile) {
    const cacheKey = `${typeName}:${schemaFile}`;
    
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey);
    }

    const docType = this.documentTypes.get(typeName);
    const schemaPath = docType ? 
      path.join(docType.path, schemaFile) : 
      path.join(this.modelsPath, typeName, 'json-schema', schemaFile);
    
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    this.schemaCache.set(cacheKey, schema);
    return schema;
  }

  /**
   * Get validator for a document type
   */
  async getValidator(typeName) {
    if (this.validatorCache.has(typeName)) {
      return this.validatorCache.get(typeName);
    }
    
    const docType = this.documentTypes.get(typeName);
    if (!docType) {
      throw new Error(`Unknown document type: ${typeName}`);
    }

    // Pre-load all schema files
    const schemaDir = docType.path;
    const schemaFiles = await fs.readdir(schemaDir);
    
    for (const file of schemaFiles) {
      if (file.endsWith('.schema.json')) {
        const schemaPath = path.join(schemaDir, file);
        const schemaContent = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaContent);
        
        const shortName = file.replace('.schema.json', '');
        
        if (!this.ajv.getSchema(shortName)) {
          this.ajv.addSchema(schema, shortName);
        }
      }
    }
    
    // Load and compile main schema
    const schema = await this.loadSchema(typeName, docType.entrypoint);
    const schemaWithoutId = { ...schema };
    delete schemaWithoutId.$id;
    delete schemaWithoutId.$schema;
    
    const validator = this.ajv.compile(schemaWithoutId);
    this.validatorCache.set(typeName, validator);
    
    return validator;
  }

  /**
   * Validate a document
   */
  async validate(typeName, documentData) {
    try {
      const validator = await this.getValidator(typeName);
      const valid = validator(documentData);
      
      return {
        valid,
        errors: validator.errors || []
      };
    } catch (err) {
      return {
        valid: false,
        errors: [{ message: err.message }]
      };
    }
  }

  /**
   * Get schema structure for UI generation
   */
  async getSchemaStructure(typeName) {
    const docType = this.documentTypes.get(typeName);
    if (!docType) {
      throw new Error(`Unknown document type: ${typeName}`);
    }

    const schema = await this.loadSchema(typeName, docType.entrypoint);
    return this.parseSchemaProperties(schema, docType.uiHints, docType.customForms, docType.fieldOrder);
  }

  /**
   * Parse schema properties for UI
   */
  parseSchemaProperties(schema, uiHints = {}, customForms = {}, fieldOrder = []) {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    const propertyList = Object.entries(properties).map(([key, prop]) => {
      const fieldHints = uiHints[key] || {};
      
      return {
        name: key,
        title: prop.title || key,
        description: prop.description || '',
        type: prop.type,
        required: required.includes(key),
        format: prop.format,
        minimum: prop.minimum,
        maximum: prop.maximum,
        enum: prop.enum,
        items: prop.items,
        $ref: prop.$ref,
        displayAs: fieldHints.displayAs,
        displayType: fieldHints.displayType,
        widget: fieldHints.widget,
        placeholder: fieldHints.placeholder,
        helpText: fieldHints.helpText,
        customForm: fieldHints.customForm,
        customFormConfig: fieldHints.customForm ? customForms[fieldHints.customForm] : null
      };
    });
    
    // Apply field ordering
    if (fieldOrder && fieldOrder.length > 0) {
      const ordered = [];
      const unordered = [];
      
      fieldOrder.forEach(fieldName => {
        const prop = propertyList.find(p => p.name === fieldName);
        if (prop) {
          ordered.push(prop);
        }
      });
      
      propertyList.forEach(prop => {
        if (!fieldOrder.includes(prop.name)) {
          unordered.push(prop);
        }
      });
      
      return [...ordered, ...unordered];
    }
    
    return propertyList;
  }

  /**
   * Get custom form data
   */
  async getCustomFormData(typeName, formName) {
    const docType = this.documentTypes.get(typeName);
    if (!docType) {
      return { error: 'Unknown document type' };
    }

    const customForm = docType.customForms[formName];
    if (!customForm) {
      return { error: 'Custom form not found' };
    }

    let data = null;
    let formImplementation = null;
    
    // Load data source
    if (customForm.dataSource) {
      const dataPath = path.join(docType.modelPath, customForm.dataSource);
      try {
        data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
      } catch (err) {
        console.warn(`[SchemaService] Data source not found: ${dataPath}`);
      }
    }
    
    // Load implementation
    if (customForm.implementation) {
      const implPath = path.join(docType.modelPath, customForm.implementation);
      try {
        formImplementation = await fs.readFile(implPath, 'utf8');
      } catch (err) {
        console.warn(`[SchemaService] Implementation not found: ${implPath}`);
      }
    }
    
    return {
      success: true,
      data,
      formType: customForm.type,
      implementation: formImplementation
    };
  }

  /**
   * Create empty document of a type
   */
  async createEmptyDocument(typeName) {
    const docType = this.documentTypes.get(typeName);
    if (!docType) {
      throw new Error(`Unknown document type: ${typeName}`);
    }

    const schema = await this.loadSchema(typeName, docType.entrypoint);
    const required = schema.required || [];
    
    const documentData = {};
    required.forEach(field => {
      if (field === 'id') {
        documentData.id = this._generateUUID();
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
        renderOrder: null,
        hiddenFields: [],
        activeTemplate: null,
        comments: [],
        sharedWith: [],
        editHistory: []
      },
      data: documentData
    };
  }

  /**
   * Infer document type from data
   */
  async inferDocumentType(jsonData) {
    for (const [typeName, docType] of this.documentTypes) {
      try {
        const validation = await this.validate(typeName, jsonData);
        if (validation.valid) {
          return typeName;
        }
      } catch (err) {
        continue;
      }
    }
    return null;
  }

  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = SchemaService;
