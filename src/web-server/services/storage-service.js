/**
 * Storage Service
 * 
 * Handles document storage for the web server.
 * Uses local filesystem storage by default.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class StorageService {
  constructor(options = {}) {
    // Default storage directory
    this.storageDir = options.storageDir || path.join(__dirname, '../../../storage');
    this.documentsDir = path.join(this.storageDir, 'documents');
    this.templatesDir = path.join(this.storageDir, 'templates');
  }

  /**
   * Initialize storage directories
   */
  async initialize() {
    try {
      await fs.mkdir(this.documentsDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
      console.log('[StorageService] Storage directories initialized');
    } catch (err) {
      console.error('[StorageService] Failed to initialize storage:', err);
      throw err;
    }
  }

  /**
   * Generate a unique document ID
   */
  generateId() {
    return crypto.randomUUID();
  }

  /**
   * Save a document
   */
  async saveDocument(documentId, document) {
    const filePath = path.join(this.documentsDir, `${documentId}.json`);
    
    // Update metadata
    document.metadata.modified = new Date().toISOString();
    if (!document.metadata.editHistory) {
      document.metadata.editHistory = [];
    }
    document.metadata.editHistory.push({
      timestamp: new Date().toISOString(),
      action: 'save'
    });
    
    await fs.writeFile(filePath, JSON.stringify(document, null, 2), 'utf8');
    
    return { success: true, documentId, filePath };
  }

  /**
   * Load a document by ID
   */
  async loadDocument(documentId) {
    const filePath = path.join(this.documentsDir, `${documentId}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const document = JSON.parse(content);
      return { success: true, document };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { success: false, error: 'Document not found' };
      }
      throw err;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId) {
    const filePath = path.join(this.documentsDir, `${documentId}.json`);
    
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { success: false, error: 'Document not found' };
      }
      throw err;
    }
  }

  /**
   * List all documents
   */
  async listDocuments() {
    try {
      const files = await fs.readdir(this.documentsDir);
      const documents = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const documentId = file.replace('.json', '');
          const filePath = path.join(this.documentsDir, file);
          
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const document = JSON.parse(content);
            
            documents.push({
              id: documentId,
              title: document.data?.title || 'Untitled',
              type: document.metadata?.documentType,
              modified: document.metadata?.modified,
              created: document.metadata?.created
            });
          } catch (err) {
            console.warn(`[StorageService] Failed to read document ${file}:`, err);
          }
        }
      }
      
      // Sort by modification date (newest first)
      documents.sort((a, b) => new Date(b.modified) - new Date(a.modified));
      
      return { success: true, documents };
    } catch (err) {
      console.error('[StorageService] Failed to list documents:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Parse document content (for imports)
   */
  parseDocument(content) {
    try {
      const parsed = JSON.parse(content);
      
      // Check if it's our file format or raw data
      if (parsed.metadata && parsed.data) {
        return { success: true, document: parsed };
      }
      
      // Raw JSON - wrap in document format
      return { 
        success: true, 
        document: null, 
        rawData: parsed 
      };
    } catch (err) {
      return { success: false, error: `Invalid JSON: ${err.message}` };
    }
  }

  /**
   * Save template
   */
  async saveTemplate(documentType, templateName, content) {
    const typeDir = path.join(this.templatesDir, documentType);
    await fs.mkdir(typeDir, { recursive: true });
    
    const safeName = templateName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filePath = path.join(typeDir, `${safeName}.md`);
    
    await fs.writeFile(filePath, content, 'utf8');
    
    return { 
      success: true, 
      templateId: `user:${documentType}:${safeName}`,
      name: templateName
    };
  }

  /**
   * Load user templates for a document type
   */
  async loadUserTemplates(documentType) {
    const typeDir = path.join(this.templatesDir, documentType);
    
    try {
      const files = await fs.readdir(typeDir);
      const templates = [];
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const name = file.replace('.md', '');
          const filePath = path.join(typeDir, file);
          
          try {
            const content = await fs.readFile(filePath, 'utf8');
            templates.push({
              id: `user:${documentType}:${name}`,
              name: name.replace(/_/g, ' '),
              source: 'user',
              content
            });
          } catch (err) {
            console.warn(`[StorageService] Failed to read template ${file}:`, err);
          }
        }
      }
      
      return templates;
    } catch (err) {
      // Directory doesn't exist - no user templates
      if (err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }
}

module.exports = StorageService;
