/**
 * Platform API - Unified interface for platform-specific operations
 * 
 * This module provides a consistent API for both Electron and Web platforms.
 * It detects the runtime environment and uses the appropriate implementation.
 */

// Detect platform
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
const isWeb = !isElectron;

/**
 * Platform API interface
 * Provides unified access to platform operations
 */
class PlatformAPI {
  constructor() {
    this.isElectron = isElectron;
    this.isWeb = isWeb;
    this.platform = isElectron ? (window.electronAPI.platform || 'electron') : 'web';
    
    // Event listeners registry for cleanup
    this._eventListeners = new Map();
  }

  // ==================== Document Type Operations ====================

  /**
   * Get available document types
   * @returns {Promise<Array>} List of document types
   */
  async getDocumentTypes() {
    if (isElectron) {
      return window.electronAPI.getDocumentTypes();
    }
    return this._webRequest('/api/document-types');
  }

  /**
   * Get schema structure for a document type
   * @param {string} documentType - Document type name
   * @returns {Promise<Array>} Schema properties
   */
  async getSchemaStructure(documentType) {
    if (isElectron) {
      return window.electronAPI.getSchemaStructure(documentType);
    }
    return this._webRequest(`/api/schemas/${documentType}/structure`);
  }

  /**
   * Get custom form data for a document type
   * @param {string} documentType - Document type name
   * @param {string} formName - Custom form name
   * @returns {Promise<Object>} Custom form data
   */
  async getCustomFormData(documentType, formName) {
    if (isElectron) {
      return window.electronAPI.getCustomFormData(documentType, formName);
    }
    return this._webRequest(`/api/schemas/${documentType}/custom-forms/${formName}`);
  }

  // ==================== Document Operations ====================

  /**
   * Create a new document
   * @param {string} documentType - Document type name
   * @returns {Promise<Object>} Result with new document
   */
  async createNewDocument(documentType) {
    if (isElectron) {
      return window.electronAPI.createNewDocument(documentType);
    }
    return this._webRequest('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ documentType })
    });
  }

  /**
   * Show open document dialog
   * @returns {Promise<Object>} Dialog result with file path or file content
   */
  async openDocumentDialog() {
    if (isElectron) {
      return window.electronAPI.openDocumentDialog();
    }
    // Web implementation uses file input
    return this._webFilePickerOpen();
  }

  /**
   * Load a document from file path or content
   * @param {string|Object} filePathOrContent - File path (Electron) or file content (Web)
   * @returns {Promise<Object>} Loaded document
   */
  async loadDocument(filePathOrContent) {
    if (isElectron) {
      return window.electronAPI.loadDocument(filePathOrContent);
    }
    // Web: filePathOrContent is the document content from file picker
    if (typeof filePathOrContent === 'object' && filePathOrContent.content) {
      return this._webRequest('/api/documents/parse', {
        method: 'POST',
        body: JSON.stringify({ content: filePathOrContent.content })
      });
    }
    // Load from server by ID
    return this._webRequest(`/api/documents/${filePathOrContent}`);
  }

  /**
   * Show save document dialog
   * @param {boolean} isExport - Whether this is an export operation
   * @param {string} defaultPath - Default file path
   * @returns {Promise<Object>} Dialog result
   */
  async saveDocumentDialog(isExport, defaultPath) {
    if (isElectron) {
      return window.electronAPI.saveDocumentDialog(isExport, defaultPath);
    }
    // Web: Return a generated filename, actual save happens differently
    const extension = isExport ? 'json' : 'mdf';
    const defaultName = defaultPath ? 
      defaultPath.replace(/\.[^.]+$/, `.${extension}`) : 
      `document.${extension}`;
    return { success: true, filePath: defaultName, isWebDownload: true };
  }

  /**
   * Save a document
   * @param {string} filePath - File path or ID
   * @param {Object} document - Document to save
   * @returns {Promise<Object>} Save result
   */
  async saveDocument(filePath, document) {
    if (isElectron) {
      return window.electronAPI.saveDocument(filePath, document);
    }
    // Web: Trigger download or save to server
    return this._webSaveDocument(filePath, document, false);
  }

  /**
   * Export document as clean JSON
   * @param {string} filePath - File path
   * @param {Object} document - Document to export
   * @returns {Promise<Object>} Export result
   */
  async exportDocument(filePath, document) {
    if (isElectron) {
      return window.electronAPI.exportDocument(filePath, document);
    }
    return this._webSaveDocument(filePath, document, true);
  }

  /**
   * Validate a document
   * @param {Object} document - Document to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateDocument(document) {
    if (isElectron) {
      return window.electronAPI.validateDocument(document);
    }
    return this._webRequest('/api/documents/validate', {
      method: 'POST',
      body: JSON.stringify(document)
    });
  }

  /**
   * Show unsaved changes dialog
   * @returns {Promise<Object>} Dialog result with user choice
   */
  async showUnsavedChangesDialog() {
    if (isElectron) {
      return window.electronAPI.showUnsavedChangesDialog();
    }
    // Web: Use browser confirm dialog
    const message = 'You have unsaved changes. Do you want to save them?';
    const save = confirm(message + '\n\nClick OK to save, Cancel to discard.');
    return { choice: save ? 0 : 1 }; // 0 = Save, 1 = Don't Save
  }

  // ==================== Document Editing ====================

  /**
   * Update a field in the document
   * @param {Object} document - Document to update
   * @param {string} fieldPath - Path to field
   * @param {*} value - New value
   * @returns {Promise<Object>} Updated document
   */
  async updateField(document, fieldPath, value) {
    if (isElectron) {
      return window.electronAPI.updateField(document, fieldPath, value);
    }
    // Web: Update locally and return
    return this._updateFieldLocally(document, fieldPath, value);
  }

  /**
   * Add an array item
   * @param {Object} document - Document to update
   * @param {string} arrayPath - Path to array
   * @param {*} item - Item to add
   * @returns {Promise<Object>} Updated document
   */
  async addArrayItem(document, arrayPath, item) {
    if (isElectron) {
      return window.electronAPI.addArrayItem(document, arrayPath, item);
    }
    return this._addArrayItemLocally(document, arrayPath, item);
  }

  /**
   * Remove an array item
   * @param {Object} document - Document to update
   * @param {string} arrayPath - Path to array
   * @param {number} index - Index to remove
   * @returns {Promise<Object>} Updated document
   */
  async removeArrayItem(document, arrayPath, index) {
    if (isElectron) {
      return window.electronAPI.removeArrayItem(document, arrayPath, index);
    }
    return this._removeArrayItemLocally(document, arrayPath, index);
  }

  /**
   * Add a comment to the document
   * @param {Object} document - Document
   * @param {string} comment - Comment text
   * @param {string} sectionPath - Section path
   * @returns {Promise<Object>} Updated document
   */
  async addComment(document, comment, sectionPath) {
    if (isElectron) {
      return window.electronAPI.addComment(document, comment, sectionPath);
    }
    // Web: Add comment locally
    if (!document.metadata.comments) {
      document.metadata.comments = [];
    }
    document.metadata.comments.push({
      id: this._generateId(),
      timestamp: new Date().toISOString(),
      text: comment,
      sectionPath
    });
    return { success: true, document };
  }

  // ==================== Configuration ====================

  /**
   * Get configuration value
   * @param {string} key - Config key
   * @returns {Promise<Object>} Config value
   */
  async configGet(key) {
    if (isElectron) {
      return window.electronAPI.configGet(key);
    }
    // Web: Use localStorage (with window prefix for test compatibility)
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage) {
      return { success: false, error: 'localStorage not available' };
    }
    const value = storage.getItem(`mdwriter_config_${key}`);
    return { success: true, value: value ? JSON.parse(value) : null };
  }

  /**
   * Set configuration value
   * @param {string} key - Config key
   * @param {*} value - Config value
   * @returns {Promise<Object>} Result
   */
  async configSet(key, value) {
    if (isElectron) {
      return window.electronAPI.configSet(key, value);
    }
    // Web: Use localStorage (with window prefix for test compatibility)
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage) {
      return { success: false, error: 'localStorage not available' };
    }
    storage.setItem(`mdwriter_config_${key}`, JSON.stringify(value));
    return { success: true };
  }

  /**
   * Get all configuration
   * @returns {Promise<Object>} All config
   */
  async configGetAll() {
    if (isElectron) {
      return window.electronAPI.configGetAll();
    }
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage) {
      return { success: false, error: 'localStorage not available' };
    }
    const config = {};
    const prefix = 'mdwriter_config_';
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key.startsWith(prefix)) {
        config[key.slice(prefix.length)] = JSON.parse(storage.getItem(key));
      }
    }
    return { success: true, config };
  }

  /**
   * Get preference value
   * @param {string} key - Preference key
   * @param {*} defaultValue - Default value
   * @returns {Promise<Object>} Preference value
   */
  async configGetPreference(key, defaultValue) {
    if (isElectron) {
      return window.electronAPI.configGetPreference(key, defaultValue);
    }
    const result = await this.configGet(`preferences.${key}`);
    return { 
      success: true, 
      value: result.value !== null ? result.value : defaultValue 
    };
  }

  /**
   * Set preference value
   * @param {string} key - Preference key
   * @param {*} value - Preference value
   * @returns {Promise<Object>} Result
   */
  async configSetPreference(key, value) {
    if (isElectron) {
      return window.electronAPI.configSetPreference(key, value);
    }
    return this.configSet(`preferences.${key}`, value);
  }

  /**
   * Add file to recent files
   * @param {string} filePath - File path
   * @returns {Promise<Object>} Result
   */
  async configAddRecentFile(filePath) {
    if (isElectron) {
      return window.electronAPI.configAddRecentFile(filePath);
    }
    const result = await this.configGet('recentFiles');
    let recentFiles = result.value || [];
    recentFiles = recentFiles.filter(f => f !== filePath);
    recentFiles.unshift(filePath);
    recentFiles = recentFiles.slice(0, 10);
    return this.configSet('recentFiles', recentFiles);
  }

  /**
   * Get recent files
   * @returns {Promise<Object>} Recent files
   */
  async configGetRecentFiles() {
    if (isElectron) {
      return window.electronAPI.configGetRecentFiles();
    }
    const result = await this.configGet('recentFiles');
    return { success: true, files: result.value || [] };
  }

  /**
   * Get userspace models directory
   * @returns {Promise<Object>} Directory path
   */
  async configGetUserspaceModelsDir() {
    if (isElectron) {
      return window.electronAPI.configGetUserspaceModelsDir();
    }
    // Web: Not applicable
    return { success: true, path: null };
  }

  /**
   * Set userspace models directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<Object>} Result
   */
  async configSetUserspaceModelsDir(dirPath) {
    if (isElectron) {
      return window.electronAPI.configSetUserspaceModelsDir(dirPath);
    }
    // Web: Not applicable
    return { success: false, error: 'Not supported in web mode' };
  }

  // ==================== Templates ====================

  /**
   * Load templates for document type
   * @param {string} documentType - Document type
   * @returns {Promise<Object>} Templates
   */
  async templatesLoad(documentType) {
    if (isElectron) {
      return window.electronAPI.templatesLoad(documentType);
    }
    return this._webRequest(`/api/templates/${documentType}`);
  }

  /**
   * Render document with template
   * @param {string} templateId - Template ID
   * @param {Object} documentData - Document data
   * @param {string} documentType - Document type
   * @returns {Promise<Object>} Rendered output
   */
  async templatesRender(templateId, documentData, documentType) {
    if (isElectron) {
      return window.electronAPI.templatesRender(templateId, documentData, documentType);
    }
    return this._webRequest('/api/templates/render', {
      method: 'POST',
      body: JSON.stringify({ templateId, documentData, documentType })
    });
  }

  /**
   * Create a new template
   * @param {string} documentType - Document type
   * @param {string} name - Template name
   * @param {string} content - Template content
   * @returns {Promise<Object>} Created template
   */
  async templatesCreate(documentType, name, content) {
    if (isElectron) {
      return window.electronAPI.templatesCreate(documentType, name, content);
    }
    return this._webRequest('/api/templates', {
      method: 'POST',
      body: JSON.stringify({ documentType, name, content })
    });
  }

  /**
   * Set active template
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Result
   */
  async templatesSetActive(templateId) {
    if (isElectron) {
      return window.electronAPI.templatesSetActive(templateId);
    }
    return this.configSet('activeTemplate', templateId);
  }

  /**
   * Get active template
   * @returns {Promise<Object>} Active template ID
   */
  async templatesGetActive() {
    if (isElectron) {
      return window.electronAPI.templatesGetActive();
    }
    const result = await this.configGet('activeTemplate');
    return { success: true, templateId: result.value };
  }

  // ==================== Import ====================

  /**
   * Import clean JSON
   * @param {string} filePath - File path or content
   * @param {Object} existingDocument - Existing document to merge into
   * @returns {Promise<Object>} Imported document
   */
  async importCleanJSON(filePath, existingDocument) {
    if (isElectron) {
      return window.electronAPI.importCleanJSON(filePath, existingDocument);
    }
    // Web: filePath is content from file picker
    return this._webRequest('/api/documents/import', {
      method: 'POST',
      body: JSON.stringify({ 
        content: typeof filePath === 'object' ? filePath.content : filePath,
        existingDocument 
      })
    });
  }

  // ==================== Menu State (Electron only) ====================

  /**
   * Update menu state
   * @param {Object} state - Menu state
   * @returns {Promise<Object>} Result
   */
  async updateMenuState(state) {
    if (isElectron) {
      return window.electronAPI.updateMenuState(state);
    }
    // Web: No native menus
    return { success: true };
  }

  // ==================== Collaboration ====================

  /**
   * Host a collaboration session
   * @param {Object} document - Document to share
   * @param {Object} metadata - Session metadata
   * @returns {Promise<Object>} Session info
   */
  async collabHostSession(document, metadata) {
    if (isElectron) {
      return window.electronAPI.collabHostSession(document, metadata);
    }
    return this._webRequest('/api/collaboration/host', {
      method: 'POST',
      body: JSON.stringify({ document, metadata })
    });
  }

  /**
   * Stop hosting
   * @returns {Promise<Object>} Result
   */
  async collabStopHosting() {
    if (isElectron) {
      return window.electronAPI.collabStopHosting();
    }
    return this._webRequest('/api/collaboration/stop', { method: 'POST' });
  }

  /**
   * Start session discovery
   * @returns {Promise<Object>} Result
   */
  async collabStartDiscovery() {
    if (isElectron) {
      return window.electronAPI.collabStartDiscovery();
    }
    // Web: Query server for active sessions
    return { success: true };
  }

  /**
   * Stop session discovery
   * @returns {Promise<Object>} Result
   */
  async collabStopDiscovery() {
    if (isElectron) {
      return window.electronAPI.collabStopDiscovery();
    }
    return { success: true };
  }

  /**
   * Get discovered sessions
   * @returns {Promise<Object>} Sessions
   */
  async collabGetDiscoveredSessions() {
    if (isElectron) {
      return window.electronAPI.collabGetDiscoveredSessions();
    }
    return this._webRequest('/api/collaboration/sessions');
  }

  /**
   * Get current session
   * @returns {Promise<Object>} Current session
   */
  async collabGetCurrentSession() {
    if (isElectron) {
      return window.electronAPI.collabGetCurrentSession();
    }
    return this._webRequest('/api/collaboration/current');
  }

  // ==================== Event Listeners ====================

  /**
   * Register event listener (Electron IPC events)
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  onEvent(event, callback) {
    if (isElectron && window.electronAPI[event]) {
      window.electronAPI[event](callback);
      this._eventListeners.set(event, callback);
    }
    // Web: Events handled differently (WebSocket, etc.)
  }

  /**
   * Register menu action listener
   * @param {string} action - Action name
   * @param {Function} callback - Callback function
   */
  onMenuAction(action, callback) {
    if (isElectron && window.electronAPI.onMenuAction) {
      window.electronAPI.onMenuAction(action, callback);
    }
    // Web: No native menus, but could be implemented with custom menu
  }

  /**
   * Remove menu listener
   * @param {string} action - Action name
   * @param {Function} callback - Callback function
   */
  removeMenuListener(action, callback) {
    if (isElectron && window.electronAPI.removeMenuListener) {
      window.electronAPI.removeMenuListener(action, callback);
    }
  }

  /**
   * Send log to main process
   * @param {string} level - Log level
   * @param {Array} args - Log arguments
   */
  sendLog(level, args) {
    if (isElectron && window.electronAPI.sendLog) {
      window.electronAPI.sendLog(level, args);
    } else {
      // Web: Just log to console
      console[level]?.(...args) || console.log(...args);
    }
  }

  // ==================== Web-specific implementations ====================

  /**
   * Make a web request to the backend API
   * @private
   */
  async _webRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { success: false, error: error.message || response.statusText };
      }
      
      const data = await response.json();
      return { success: true, ...data };
    } catch (err) {
      console.error('[PlatformAPI] Web request error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Open file picker for web
   * @private
   */
  async _webFilePickerOpen() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.mdf,.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const content = await file.text();
            resolve({ 
              success: true, 
              filePath: file.name,
              content,
              file 
            });
          } catch (err) {
            resolve({ success: false, error: err.message });
          }
        } else {
          resolve({ success: false });
        }
      };
      
      // Handle cancel
      input.oncancel = () => resolve({ success: false });
      
      // Also handle focus loss (user clicked away)
      const handleFocus = () => {
        setTimeout(() => {
          if (!input.files?.length) {
            resolve({ success: false });
          }
        }, 300);
        window.removeEventListener('focus', handleFocus);
      };
      window.addEventListener('focus', handleFocus);
      
      input.click();
    });
  }

  /**
   * Save document for web (download)
   * @private
   */
  async _webSaveDocument(filePath, document, isExport) {
    try {
      const content = isExport ? 
        JSON.stringify(document.data, null, 2) : 
        JSON.stringify(document, null, 2);
      
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath || (isExport ? 'export.json' : 'document.mdf');
      a.click();
      
      URL.revokeObjectURL(url);
      
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update field locally (web mode)
   * @private
   */
  _updateFieldLocally(document, fieldPath, value) {
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
    
    return { success: true, document };
  }

  /**
   * Add array item locally (web mode)
   * @private
   */
  _addArrayItemLocally(document, arrayPath, item) {
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
    
    return { success: true, document };
  }

  /**
   * Remove array item locally (web mode)
   * @private
   */
  _removeArrayItemLocally(document, arrayPath, index) {
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
    
    return { success: true, document };
  }

  /**
   * Generate a unique ID
   * @private
   */
  _generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Create singleton instance
const platformAPI = new PlatformAPI();

// Export for both browser and module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = platformAPI;
  module.exports.PlatformAPI = PlatformAPI;
}

// Also expose as window.platformAPI for browser use
if (typeof window !== 'undefined') {
  window.platformAPI = platformAPI;
}
