/**
 * Template Manager
 * 
 * Manages document templates for rendering output.
 * Templates can be loaded from:
 * 1. models/<type>/templates directory (bundled with document types)
 * 2. User templates directory (user-specified location)
 */

const fs = require('fs').promises;
const path = require('path');

class TemplateManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.templates = new Map(); // templateId -> template data
  }
  
  /**
   * Load all available templates for a document type
   */
  async loadTemplatesForType(documentType) {
    const templates = [];
    
    // 1. Load bundled templates from models/<type>/templates
    try {
      const modelTemplatesDir = path.join(
        process.cwd(),
        'models',
        documentType,
        'templates'
      );
      
      const bundledTemplates = await this.loadTemplatesFromDirectory(
        modelTemplatesDir,
        'bundled',
        documentType
      );
      templates.push(...bundledTemplates);
    } catch (err) {
      console.log(`[TemplateManager] No bundled templates for ${documentType}:`, err.message);
    }
    
    // 2. Load user templates
    try {
      const userTemplatesDir = this.configManager.getUserspaceTemplatesDirectory();
      const typeTemplatesDir = path.join(userTemplatesDir, documentType);
      
      const userTemplates = await this.loadTemplatesFromDirectory(
        typeTemplatesDir,
        'user',
        documentType
      );
      templates.push(...userTemplates);
    } catch (err) {
      console.log(`[TemplateManager] No user templates for ${documentType}:`, err.message);
    }
    
    // Cache templates
    // Preserve relative ordering: bundled first then user (tests rely on index 0 being bundled)
    templates.forEach(t => this.templates.set(t.id, t));
    
    return templates;
  }
  
  /**
   * Load templates from a specific directory
   */
  async loadTemplatesFromDirectory(dirPath, source, documentType) {
    const templates = [];
    
    try {
      // Check if directory exists
      await fs.access(dirPath);
      
      // Read all .md files
      const files = await fs.readdir(dirPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of mdFiles) {
        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Parse template metadata (if exists)
        const metadata = this.parseTemplateMetadata(content);
        const templateId = `${source}:${documentType}:${path.parse(file).name}`;
        
        // Normalise filePath.
        const normalizedFilePath = filePath.replace(/\\/g, '/');

        const template = {
          id: templateId,
          name: metadata.name || path.parse(file).name,
          description: metadata.description || '',
          source: source,
          documentType,
          normalizedFilePath,
          content,
          placeholders: this.extractPlaceholders(content)
        };
        
        templates.push(template);
      }
      
      console.log(`[TemplateManager] Loaded ${templates.length} templates from ${dirPath} as ${source}`);
    } catch (err) {
      // Directory doesn't exist or can't be read
      console.log(`[TemplateManager] Could not load templates from ${dirPath}:`, err.message);
    }
    
    return templates;
  }
  
  /**
   * Parse template metadata from frontmatter
   * Expected format:
   * ---
   * name: Template Name
   * description: Template description
   * ---
   */
  parseTemplateMetadata(content) {
    const metadata = {};
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const lines = frontmatter.split('\n');
      
      for (const line of lines) {
        // Accept only single colon key: value pairs
        const parts = line.split(':');
        if (parts.length === 2) { // treat extra colons as malformed; ignore
          const key = parts[0].trim();
          const value = parts[1].trim();
          if (/^[a-zA-Z0-9_-]+$/.test(key)) {
            metadata[key] = value;
          }
        }
      }
    }
    
    return metadata;
  }
  
  /**
   * Extract placeholders from template content
   * Placeholders are in format: {{fieldName}} or {{fieldName:format}}
   */
  extractPlaceholders(content) {
    const placeholders = new Set();
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const placeholder = match[1].trim();
      const [fieldName] = placeholder.split(':');
      placeholders.add(fieldName.trim());
    }
    
    return Array.from(placeholders);
  }
  
  /**
   * Get template by ID
   */
  getTemplate(templateId) {
    return this.templates.get(templateId);
  }
  
  /**
   * Render a document using a template
   * @param {string} templateId - The template ID
   * @param {object} documentData - The document data
   * @param {string} documentType - The document type (for custom form lookup)
   */
  async renderDocument(templateId, documentData, documentType = null) {
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Load document type metadata if provided
    let metadata = null;
    if (documentType) {
      try {
        const metadataPath = path.join(process.cwd(), 'models', documentType, `${documentType}.json`);
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
        metadata._documentType = documentType; // Store for later use
      } catch (err) {
        console.warn('[TemplateManager] Could not load metadata for custom forms:', err.message);
      }
    }
    
    let output = template.content;
    
    // Remove frontmatter (YAML between --- lines at the start)
    output = output.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    
    // Replace placeholders with document data
    const regex = /\{\{([^}]+)\}\}/g;
    
    output = output.replace(regex, (match, placeholder) => {
      const [fieldName, format] = placeholder.trim().split(':').map(s => s.trim());
      
      // Get value from document data
      const value = this.getValueFromPath(documentData, fieldName);
      
      if (value === undefined || value === null) {
        return ''; // Empty string for missing values
      }
      
      // Apply formatting if specified
      if (format) {
        return this.formatValue(value, format, fieldName, metadata);
      }
      
      // Default formatting based on type
      return this.formatValue(value, 'auto', fieldName, metadata);
    });
    
    return output;
  }
  
  /**
   * Get value from document data using dot notation path
   */
  getValueFromPath(data, propPath) {
    const keys = propPath.split('.');
    let value = data;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return undefined;
    }

    return value;
  }
  
  /**
   * Format a value based on format specifier
   * @param {*} value - The value to format
   * @param {string} format - The format specifier
   * @param {string} fieldPath - The field path (for custom form lookup)
   * @param {object} metadata - The document type metadata (for custom form lookup)
   */
  formatValue(value, format, fieldPath = null, metadata = null) {
    // Try to use custom form renderForDisplay if available
    if (fieldPath && metadata) {
      const customFormPath = this.getCustomFormPath(fieldPath, metadata);
      if (customFormPath) {
        try {
          const customForm = require(customFormPath);
          if (typeof customForm.renderForDisplay === 'function') {
            const rendered = customForm.renderForDisplay(value);
            if (rendered !== null && rendered !== undefined) {
              return rendered;
            }
          }
        } catch (err) {
          console.warn(`[TemplateManager] Could not load custom form for ${fieldPath}:`, err.message);
        }
      }
    }
    
    if (Array.isArray(value)) {
      if (format === 'list' || format === 'auto') {
        return value.map(item => {
          if (typeof item === 'object') {
            // For objects, try to find a title/name property
            return item.title || item.name || JSON.stringify(item);
          }
          return String(item);
        }).join('\n- ');
      } else if (format === 'numbered') {
        return value.map((item, index) => {
          if (typeof item === 'object') {
            return `${index + 1}. ` + (item.title || item.name || JSON.stringify(item));
          }
          return `${index + 1}. ${item}`;
        }).join('\n');
      } else if (format === 'comma') {
        return value.map(item => {
          if (typeof item === 'object') {
            return item.title || item.name || JSON.stringify(item);
          }
          return String(item);
        }).join(', ');
      }
    }
    
    if (typeof value === 'object') {
      // For objects, try common title properties
      if (value.title) return value.title;
      if (value.name) return value.name;
      if (value.description) return value.description;
      
      // Otherwise, format as key-value pairs
      return Object.entries(value)
        .map(([k, v]) => `**${k}**: ${v}`)
        .join('\n');
    }
    
    return String(value);
  }
  
  /**
   * Get custom form path from metadata for a field
   */
  getCustomFormPath(fieldPath, metadata) {
    if (!metadata || !metadata.uiHints || !metadata.customForms || !metadata._documentType) {
      return null;
    }
    
    // Check if this field has a custom form in uiHints
    const fieldHints = metadata.uiHints[fieldPath];
    if (!fieldHints || !fieldHints.customForm) {
      return null;
    }
    
    // Get the custom form config
    const customFormConfig = metadata.customForms[fieldHints.customForm];
    if (!customFormConfig || !customFormConfig.implementation) {
      return null;
    }
    
    // Build the absolute path to the custom form implementation
    return path.join(process.cwd(), 'models', metadata._documentType, customFormConfig.implementation);
  }
  
  /**
   * Create a new template in user templates directory
   */
  async createTemplate(documentType, name, content) {
    const userTemplatesDir = this.configManager.getUserspaceTemplatesDirectory();
    const typeTemplatesDir = path.join(userTemplatesDir, documentType);
    
    // Ensure directory exists
    await fs.mkdir(typeTemplatesDir, { recursive: true });
    
    // Create file
    const fileName = name.toLowerCase().replace(/\s+/g, '-') + '.md';
    const filePath = path.join(typeTemplatesDir, fileName);
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    console.log('[TemplateManager] Created template:', filePath);
    
    // Reload templates for this type
    await this.loadTemplatesForType(documentType);
    
    return {
      success: true,
      templateId: `user:${documentType}:${path.parse(fileName).name}`,
      filePath: filePath
    };
  }

  /**
   * Render a simple template object (tests pass inline object with content).
   * Supports:
   *  - {{path.to.field}} placeholders
   *  - {{#each items}}...{{/each}} blocks (minimal implementation)
   * Missing values are left as their original placeholder.
   */
  async renderTemplate(templateObj, data) {
    if (!templateObj || typeof templateObj.content !== 'string') {
      return '';
    }
    let output = templateObj.content;

    // Handle each blocks first
    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    output = output.replace(eachRegex, (match, collectionPath, inner) => {
      const collection = this.getValueFromPath(data, collectionPath.trim());
      if (!Array.isArray(collection)) {
        return ''; // If not array, drop block
      }
      return collection.map(item => {
        return inner.replace(/\{\{([^}]+)\}\}/g, (m, ph) => {
          const key = ph.trim();
          const val = item[key];
          return (val === undefined || val === null) ? m : String(val);
        });
      }).join('');
    });

    // Replace simple placeholders
    output = output.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
      // Skip if it's an each directive already processed or closing tag
      if (placeholder.startsWith('#each') || placeholder.startsWith('/each')) {
        return ''; // remove stray directive remnants if any
      }
      const value = this.getValueFromPath(data, placeholder.trim());
      if (value === undefined || value === null) {
        return match; // leave placeholder untouched per test expectation
      }
      return String(value);
    });
    return output;
  }

  /**
   * Save a user template to disk with frontmatter.
   */
  async saveUserTemplate(documentType, templateId, template) {
    try {
      const userTemplatesDir = this.configManager.getUserspaceTemplatesDirectory();
      const typeDir = path.join(userTemplatesDir, documentType);
      await fs.mkdir(typeDir, { recursive: true });
      const filePath = path.join(typeDir, `${templateId}.md`);
      const frontmatterLines = [
        '---',
        `name: ${template.name || templateId}`
      ];
      if (template.description) {
        frontmatterLines.push(`description: ${template.description}`);
      }
      frontmatterLines.push('---');
      const content = `${frontmatterLines.join('\n')}\n${template.content || ''}`;
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true, templateId: `user:${documentType}:${templateId}`, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a user template. templateKey format: user:<type>:<id>
   */
  async deleteUserTemplate(templateKey) {
    try {
      const [source, typeName, id] = templateKey.split(':');
      if (source !== 'user') {
        return { success: false, error: 'Cannot delete bundled or non-user templates' };
      }
      const userTemplatesDir = this.configManager.getUserspaceTemplatesDirectory();
      const filePath = path.join(userTemplatesDir, typeName, `${id}.md`);
      await fs.unlink(filePath);
      // Remove from in-memory cache if present
      this.templates.delete(templateKey);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

// Export the constructor as the module export but also attach as a property
// so tests can import either the default or destructured form.
module.exports = TemplateManager;
module.exports.TemplateManager = TemplateManager;
