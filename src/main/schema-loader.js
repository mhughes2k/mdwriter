const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const ajvErrors = require('ajv-errors');

class SchemaLoader {
  constructor() {
    this.ajv = new Ajv({ 
      strict: false,
      validateSchema: false, // Disable $schema validation to avoid missing schema errors
      validateFormats: true,  // Enable format validation
      allErrors: true,        // Report all errors, not just the first
      // Disable async schema loading - we pre-load all schemas instead
      // loadSchema: this.loadExternalSchema.bind(this)
    });
    
    // Add standard formats (uri, email, etc.)
    addFormats(this.ajv);
    
    // Add custom error messages support
    ajvErrors(this.ajv);
    
    // Note: exclusiveMinimum, exclusiveMaximum, and dependentRequired
    // are already supported by Ajv as standard JSON Schema keywords
    
    // Override format validators to allow empty strings ONLY for non-required fields
    // Note: Required field validation happens separately via the "required" keyword
    // This only affects format validation, not presence validation
    const formats = ['uri', 'email', 'date', 'time', 'date-time', 'uri-reference', 'uri-template', 'hostname', 'ipv4', 'ipv6'];
    formats.forEach(formatName => {
      const originalFormat = this.ajv.formats[formatName];
      if (originalFormat) {
        this.ajv.addFormat(formatName, {
          validate: (value) => {
            // Allow empty strings for format validation only
            // (required validation will catch missing required fields separately)
            if (value === '' || value == null) return true;
            // Otherwise use the original format validator
            if (typeof originalFormat === 'function') {
              return originalFormat(value);
            }
            if (originalFormat.validate) {
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
    this.modelsPath = path.join(__dirname, '../../models');
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
            this.documentTypes.set(typeName, {
              name: typeName,
              description: metadata.description,
              extensions: metadata.extensions || [typeName],
              entrypoint: metadata.entrypoint,
              fieldOrder: metadata.fieldOrder || [],
              uiHints: metadata.uiHints || {},
              customForms: metadata.customForms || {},
              path: path.join(this.modelsPath, typeName, 'json-schema'),
              modelPath: path.join(this.modelsPath, typeName)
            });
            
            console.log(`Loaded document type: ${typeName}`);
          } catch (err) {
            console.warn(`Could not load metadata for ${typeName}:`, err.message);
          }
        }
      }
      
      return Array.from(this.documentTypes.values());
    } catch (err) {
      console.error('Error loading document types:', err);
      return [];
    }
  }

  /**
   * Get document type metadata
   */
  getDocumentType(typeName) {
    return this.documentTypes.get(typeName);
  }

  /**
   * Load a JSON schema file
   */
  async loadSchema(typeName, schemaFile) {
    const cacheKey = `${typeName}:${schemaFile}`;
    
    console.log('[SchemaLoader] loadSchema called:', cacheKey);
    
    if (this.schemaCache.has(cacheKey)) {
      console.log('[SchemaLoader] Returning cached schema:', cacheKey);
      return this.schemaCache.get(cacheKey);
    }

    const docType = this.documentTypes.get(typeName);
    if (!docType) {
      throw new Error(`Unknown document type: ${typeName}`);
    }

    const schemaPath = path.join(docType.path, schemaFile);
    console.log('[SchemaLoader] Reading schema file:', schemaPath);
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    console.log('[SchemaLoader] Schema parsed, caching:', cacheKey);
    this.schemaCache.set(cacheKey, schema);
    return schema;
  }

  /**
   * Load external schema referenced via $ref
   */
  async loadExternalSchema(uri) {
    console.log('[SchemaLoader] loadExternalSchema called with uri:', uri);
    // Extract schema name from ref (e.g., "level" from "$ref": "level")
    const schemaName = uri.includes('/') ? path.basename(uri) : uri;
    const schemaFile = schemaName.endsWith('.schema.json') ? schemaName : `${schemaName}.schema.json`;
    
    console.log('[SchemaLoader] Resolved to file:', schemaFile);
    
    // Determine which document type this belongs to (for now, assume mdf)
    // In a more complex system, you'd track context during validation
    const typeName = 'mdf';
    
    const result = await this.loadSchema(typeName, schemaFile);
    console.log('[SchemaLoader] External schema loaded:', schemaFile);
    return result;
  }

  /**
   * Get compiled validator for a document type
   */
  async getValidator(typeName) {
    console.log('[SchemaLoader] getValidator called for:', typeName);
    
    // Check cache first
    if (this.validatorCache.has(typeName)) {
      console.log('[SchemaLoader] Returning cached validator');
      return this.validatorCache.get(typeName);
    }
    
    const docType = this.documentTypes.get(typeName);
    if (!docType) {
      throw new Error(`Unknown document type: ${typeName}`);
    }

    console.log('[SchemaLoader] Pre-loading all schemas for type:', typeName);
    
    // Pre-load all schema files in the directory and add them to Ajv
    const fs = require('fs').promises;
    const schemaDir = docType.path;
    const schemaFiles = await fs.readdir(schemaDir);
    
    for (const file of schemaFiles) {
      if (file.endsWith('.schema.json')) {
        const schemaPath = path.join(schemaDir, file);
        const schemaContent = await fs.readFile(schemaPath, 'utf8');
        const schema = JSON.parse(schemaContent);
        
        const shortName = file.replace('.schema.json', '');
        
        // Add by short name if not already added
        if (!this.ajv.getSchema(shortName)) {
          console.log('[SchemaLoader] Adding schema:', shortName);
          // Don't pass $id when adding by name, let Ajv use the name as key
          const schemaWithoutId = { ...schema };
          delete schemaWithoutId.$id;
          this.ajv.addSchema(schemaWithoutId, shortName);
        }
      }
    }
    
    console.log('[SchemaLoader] Loading main schema...');
    const schema = await this.loadSchema(typeName, docType.entrypoint);
    
    // Remove $id from main schema too to prevent URI-based $ref resolution
    const schemaWithoutId = { ...schema };
    delete schemaWithoutId.$id;
    delete schemaWithoutId.$schema;
    
    console.log('[SchemaLoader] Compiling main schema...');
    
    // Use compile (not compileAsync) since we pre-loaded all schemas
    const validator = this.ajv.compile(schemaWithoutId);
    console.log('[SchemaLoader] Schema compiled successfully');
    
    this.validatorCache.set(typeName, validator);
    return validator;
  }

  /**
   * Validate a document against its schema
   */
  async validate(typeName, document) {
    try {
      console.log('[SchemaLoader] Getting validator for:', typeName);
      const validator = await this.getValidator(typeName);
      console.log('[SchemaLoader] Running validation...');
      const valid = validator(document);
      console.log('[SchemaLoader] Validation result:', valid, 'errors:', validator.errors?.length || 0);
      
      return {
        valid,
        errors: validator.errors || []
      };
    } catch (err) {
      console.error('[SchemaLoader] Validation error:', err);
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
   * Parse schema properties for UI generation
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
        // Application-specific UI hints from metadata
        displayAs: fieldHints.displayAs,
        displayType: fieldHints.displayType,
        widget: fieldHints.widget,
        placeholder: fieldHints.placeholder,
        helpText: fieldHints.helpText,
        customForm: fieldHints.customForm,
        customFormConfig: fieldHints.customForm ? customForms[fieldHints.customForm] : null
      };
    });
    
    // Apply field ordering if specified
    if (fieldOrder && fieldOrder.length > 0) {
      const ordered = [];
      const unordered = [];
      
      // First, add fields in the specified order
      fieldOrder.forEach(fieldName => {
        const prop = propertyList.find(p => p.name === fieldName);
        if (prop) {
          ordered.push(prop);
        }
      });
      
      // Then, add remaining fields in schema order
      propertyList.forEach(prop => {
        if (!fieldOrder.includes(prop.name)) {
          unordered.push(prop);
        }
      });
      
      return [...ordered, ...unordered];
    }
    
    return propertyList;
  }
}

// Export singleton instance
module.exports = new SchemaLoader();

