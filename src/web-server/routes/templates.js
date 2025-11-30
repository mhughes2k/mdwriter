/**
 * Templates API Routes
 * 
 * REST endpoints for template operations
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

/**
 * GET /api/templates/:documentType
 * Get all templates for a document type
 */
router.get('/:documentType', async (req, res, next) => {
  try {
    const { documentType } = req.params;
    const schemaService = req.app.get('schemaService');
    const storageService = req.app.get('storageService');
    
    const docType = schemaService.getDocumentType(documentType);
    if (!docType) {
      return res.status(404).json({ success: false, error: 'Document type not found' });
    }
    
    const templates = [];
    
    // Load bundled templates from model directory
    const bundledTemplatesDir = path.join(docType.modelPath, 'templates');
    try {
      const files = await fs.readdir(bundledTemplatesDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const name = file.replace('.md', '');
          const content = await fs.readFile(path.join(bundledTemplatesDir, file), 'utf8');
          templates.push({
            id: `bundled:${documentType}:${name}`,
            name: name.replace(/-/g, ' ').replace(/_/g, ' '),
            source: 'bundled',
            content
          });
        }
      }
    } catch (err) {
      // No bundled templates - that's okay
      if (err.code !== 'ENOENT') {
        console.warn(`[Templates] Error loading bundled templates:`, err);
      }
    }
    
    // Load user templates
    const userTemplates = await storageService.loadUserTemplates(documentType);
    templates.push(...userTemplates);
    
    res.json({ success: true, templates });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/templates
 * Create a new user template
 */
router.post('/', async (req, res, next) => {
  try {
    const { documentType, name, content } = req.body;
    
    if (!documentType || !name || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Document type, name, and content are required' 
      });
    }
    
    const storageService = req.app.get('storageService');
    const result = await storageService.saveTemplate(documentType, name, content);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/templates/render
 * Render a document using a template
 */
router.post('/render', async (req, res, next) => {
  try {
    const { templateId, documentData, documentType } = req.body;
    
    if (!templateId || !documentData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template ID and document data are required' 
      });
    }
    
    const schemaService = req.app.get('schemaService');
    const storageService = req.app.get('storageService');
    
    // Parse template ID to find template
    const parts = templateId.split(':');
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }
    
    const [source, type, name] = parts;
    let templateContent;
    
    if (source === 'bundled') {
      // Load from model directory
      const docType = schemaService.getDocumentType(type);
      if (!docType) {
        return res.status(404).json({ success: false, error: 'Document type not found' });
      }
      
      const templatePath = path.join(docType.modelPath, 'templates', `${name}.md`);
      try {
        templateContent = await fs.readFile(templatePath, 'utf8');
      } catch (err) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }
    } else if (source === 'user') {
      // Load from user storage
      const userTemplates = await storageService.loadUserTemplates(type);
      const template = userTemplates.find(t => t.id === templateId);
      
      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }
      
      templateContent = template.content;
    } else {
      return res.status(400).json({ success: false, error: 'Invalid template source' });
    }
    
    // Render template
    const output = renderTemplate(templateContent, documentData, documentType);
    
    res.json({ success: true, output });
  } catch (err) {
    next(err);
  }
});

/**
 * Render a template with document data
 */
function renderTemplate(template, documentData, documentType) {
  // Extract data - support both {data: {...}} and direct data objects
  const data = documentData.data || documentData;
  
  let output = template;
  
  // Replace placeholders {{fieldName}} with document values
  output = output.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    const value = data[fieldName];
    
    if (value === undefined || value === null || value === '') {
      return '';
    }
    
    if (Array.isArray(value)) {
      // Handle arrays
      return value.map((item, index) => {
        if (typeof item === 'string') {
          return `- ${item}`;
        }
        if (typeof item === 'object') {
          return formatObject(item, index + 1);
        }
        return `- ${item}`;
      }).join('\n');
    }
    
    if (typeof value === 'object') {
      return formatObject(value);
    }
    
    return value;
  });
  
  // Handle conditional sections {{#fieldName}}...{{/fieldName}}
  output = output.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, fieldName, content) => {
    const value = data[fieldName];
    
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return '';
    }
    
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        let itemContent = content;
        
        // Replace {{.}} with the item itself (for string arrays)
        itemContent = itemContent.replace(/\{\{\.\}\}/g, 
          typeof item === 'string' ? item : JSON.stringify(item));
        
        // Replace {{@index}} with the index
        itemContent = itemContent.replace(/\{\{@index\}\}/g, index + 1);
        
        // Replace {{propertyName}} with object properties
        if (typeof item === 'object') {
          Object.keys(item).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            itemContent = itemContent.replace(regex, item[key] ?? '');
          });
        }
        
        return itemContent;
      }).join('\n');
    }
    
    return content;
  });
  
  // Clean up empty lines (more than 2 consecutive)
  output = output.replace(/\n{3,}/g, '\n\n');
  
  return output;
}

/**
 * Format an object for display
 */
function formatObject(obj, index) {
  if (index !== undefined) {
    return Object.entries(obj)
      .filter(([k, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `  - **${k}**: ${v}`)
      .join('\n');
  }
  
  return Object.entries(obj)
    .filter(([k, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `**${k}**: ${v}`)
    .join('\n');
}

module.exports = router;
