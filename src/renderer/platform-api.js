/**
 * Platform API - Pluggable backend architecture for MDWriter
 * 
 * This module provides a pluggable architecture that allows any platform
 * to provide its own backend implementation. External platforms can:
 * 
 * 1. Create a backend that implements the PlatformBackendInterface
 * 2. Register it using: window.MDWriter.registerBackend(myBackend)
 * 3. The editor will use the registered backend for all operations
 * 
 * Example usage for external platforms:
 * ```javascript
 * // Create your custom backend
 * const myBackend = {
 *   platform: 'my-platform',
 *   isElectron: false,
 *   isWeb: true,
 *   async getDocumentTypes() { ... },
 *   async createNewDocument(type) { ... },
 *   // ... implement all required methods
 * };
 * 
 * // Register it before the editor initializes
 * window.MDWriter = window.MDWriter || {};
 * window.MDWriter.registerBackend(myBackend);
 * ```
 */

/**
 * Interface definition - documents the contract that backends must implement
 * This serves as documentation and can be used for validation
 */
const PlatformBackendInterface = {
  // Platform identification
  platform: 'string',      // e.g., 'electron', 'web', 'my-custom-platform'
  isElectron: 'boolean',
  isWeb: 'boolean',

  // Document Type Operations
  getDocumentTypes: 'async () => Array',
  getSchemaStructure: 'async (documentType: string) => Array',
  getCustomFormData: 'async (documentType: string, formName: string) => Object',

  // Document Operations
  createNewDocument: 'async (documentType: string) => Object',
  openDocumentDialog: 'async () => Object',
  loadDocument: 'async (filePathOrContent: string|Object) => Object',
  saveDocumentDialog: 'async (isExport: boolean, defaultPath?: string) => Object',
  saveDocument: 'async (filePath: string, document: Object) => Object',
  exportDocument: 'async (filePath: string, document: Object) => Object',
  validateDocument: 'async (document: Object) => Object',
  showUnsavedChangesDialog: 'async () => Object',

  // Document Editing
  updateField: 'async (document: Object, fieldPath: string, value: any) => Object',
  addArrayItem: 'async (document: Object, arrayPath: string, item: any) => Object',
  removeArrayItem: 'async (document: Object, arrayPath: string, index: number) => Object',
  addComment: 'async (document: Object, comment: string, sectionPath?: string) => Object',

  // Configuration
  configGet: 'async (key: string) => Object',
  configSet: 'async (key: string, value: any) => Object',
  configGetAll: 'async () => Object',
  configGetPreference: 'async (key: string, defaultValue?: any) => Object',
  configSetPreference: 'async (key: string, value: any) => Object',
  configAddRecentFile: 'async (filePath: string) => Object',
  configGetRecentFiles: 'async () => Object',
  configGetUserspaceModelsDir: 'async () => Object',
  configSetUserspaceModelsDir: 'async (dirPath: string) => Object',

  // Templates
  templatesLoad: 'async (documentType: string) => Object',
  templatesRender: 'async (templateId: string, documentData: Object, documentType: string) => Object',
  templatesCreate: 'async (documentType: string, name: string, content: string) => Object',
  templatesSetActive: 'async (templateId: string) => Object',
  templatesGetActive: 'async () => Object',

  // Import
  importCleanJSON: 'async (filePath: string, existingDocument?: Object) => Object',

  // Menu
  updateMenuState: 'async (state: Object) => Object',

  // Collaboration
  collabHostSession: 'async (document: Object, metadata: Object) => Object',
  collabStopHosting: 'async () => Object',
  collabStartDiscovery: 'async () => Object',
  collabStopDiscovery: 'async () => Object',
  collabGetDiscoveredSessions: 'async () => Object',
  collabGetCurrentSession: 'async () => Object',

  // Events
  onEvent: '(event: string, callback: Function) => void',
  onMenuAction: '(action: string, callback: Function) => void',
  removeMenuListener: '(action: string, callback: Function) => void',
  sendLog: '(level: string, args: Array) => void'
};

/**
 * Get the list of required methods that a backend must implement
 */
function getRequiredMethods() {
  return Object.keys(PlatformBackendInterface);
}

/**
 * Validate that a backend implements all required methods
 * @param {Object} backend - Backend to validate
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
function validateBackend(backend) {
  const missing = [];
  for (const method of getRequiredMethods()) {
    if (!(method in backend)) {
      missing.push(method);
    }
  }
  return { valid: missing.length === 0, missing };
}

// ============================================================================
// MDWriter Global Registration System
// ============================================================================

// Initialize MDWriter global namespace
if (typeof window !== 'undefined') {
  window.MDWriter = window.MDWriter || {};
}

// Storage for the active backend
let activeBackend = null;

/**
 * Register a custom backend implementation
 * @param {Object} backend - Backend implementing PlatformBackendInterface
 * @throws {Error} If backend doesn't implement required methods
 */
function registerBackend(backend) {
  const validation = validateBackend(backend);
  if (!validation.valid) {
    console.warn('[MDWriter] Backend missing methods:', validation.missing);
    console.warn('[MDWriter] Proceeding anyway - some features may not work');
  }
  
  activeBackend = backend;
  console.log(`[MDWriter] Backend registered: ${backend.platform}`);
  
  // Also expose as window.platformAPI for compatibility
  if (typeof window !== 'undefined') {
    window.platformAPI = backend;
  }
  
  return backend;
}

/**
 * Get the currently active backend
 * @returns {Object|null} Active backend or null
 */
function getBackend() {
  return activeBackend;
}

/**
 * Check if a backend is registered
 * @returns {boolean}
 */
function hasBackend() {
  return activeBackend !== null;
}

// Expose registration functions globally
if (typeof window !== 'undefined') {
  window.MDWriter.registerBackend = registerBackend;
  window.MDWriter.getBackend = getBackend;
  window.MDWriter.hasBackend = hasBackend;
  window.MDWriter.validateBackend = validateBackend;
  window.MDWriter.PlatformBackendInterface = PlatformBackendInterface;
}

// ============================================================================
// Built-in Backend Implementations
// ============================================================================

/**
 * Electron Backend - wraps window.electronAPI
 * Automatically used when running in Electron
 */
class ElectronBackend {
  constructor() {
    this.platform = window.electronAPI?.platform || 'electron';
    this.isElectron = true;
    this.isWeb = false;
  }

  async getDocumentTypes() { return window.electronAPI.getDocumentTypes(); }
  async getSchemaStructure(documentType) { return window.electronAPI.getSchemaStructure(documentType); }
  async getCustomFormData(documentType, formName) { return window.electronAPI.getCustomFormData(documentType, formName); }
  async createNewDocument(documentType) { return window.electronAPI.createNewDocument(documentType); }
  async openDocumentDialog() { return window.electronAPI.openDocumentDialog(); }
  async loadDocument(filePath) { return window.electronAPI.loadDocument(filePath); }
  async saveDocumentDialog(isExport, defaultPath) { return window.electronAPI.saveDocumentDialog(isExport, defaultPath); }
  async saveDocument(filePath, document) { return window.electronAPI.saveDocument(filePath, document); }
  async exportDocument(filePath, document) { return window.electronAPI.exportDocument(filePath, document); }
  async validateDocument(document) { return window.electronAPI.validateDocument(document); }
  async showUnsavedChangesDialog() { return window.electronAPI.showUnsavedChangesDialog(); }
  async updateField(document, fieldPath, value) { return window.electronAPI.updateField(document, fieldPath, value); }
  async addArrayItem(document, arrayPath, item) { return window.electronAPI.addArrayItem(document, arrayPath, item); }
  async removeArrayItem(document, arrayPath, index) { return window.electronAPI.removeArrayItem(document, arrayPath, index); }
  async addComment(document, comment, sectionPath) { return window.electronAPI.addComment(document, comment, sectionPath); }
  async configGet(key) { return window.electronAPI.configGet(key); }
  async configSet(key, value) { return window.electronAPI.configSet(key, value); }
  async configGetAll() { return window.electronAPI.configGetAll(); }
  async configGetPreference(key, defaultValue) { return window.electronAPI.configGetPreference(key, defaultValue); }
  async configSetPreference(key, value) { return window.electronAPI.configSetPreference(key, value); }
  async configAddRecentFile(filePath) { return window.electronAPI.configAddRecentFile(filePath); }
  async configGetRecentFiles() { return window.electronAPI.configGetRecentFiles(); }
  async configGetUserspaceModelsDir() { return window.electronAPI.configGetUserspaceModelsDir(); }
  async configSetUserspaceModelsDir(dirPath) { return window.electronAPI.configSetUserspaceModelsDir(dirPath); }
  async templatesLoad(documentType) { return window.electronAPI.templatesLoad(documentType); }
  async templatesRender(templateId, documentData, documentType) { return window.electronAPI.templatesRender(templateId, documentData, documentType); }
  async templatesCreate(documentType, name, content) { return window.electronAPI.templatesCreate(documentType, name, content); }
  async templatesSetActive(templateId) { return window.electronAPI.templatesSetActive(templateId); }
  async templatesGetActive() { return window.electronAPI.templatesGetActive(); }
  async importCleanJSON(filePath, existingDocument) { return window.electronAPI.importCleanJSON(filePath, existingDocument); }
  async updateMenuState(state) { return window.electronAPI.updateMenuState(state); }
  async collabHostSession(document, metadata) { return window.electronAPI.collabHostSession(document, metadata); }
  async collabStopHosting() { return window.electronAPI.collabStopHosting(); }
  async collabStartDiscovery() { return window.electronAPI.collabStartDiscovery(); }
  async collabStopDiscovery() { return window.electronAPI.collabStopDiscovery(); }
  async collabGetDiscoveredSessions() { return window.electronAPI.collabGetDiscoveredSessions(); }
  async collabGetCurrentSession() { return window.electronAPI.collabGetCurrentSession(); }
  
  onEvent(event, callback) {
    if (window.electronAPI[event]) window.electronAPI[event](callback);
  }
  onMenuAction(action, callback) {
    if (window.electronAPI.onMenuAction) window.electronAPI.onMenuAction(action, callback);
  }
  removeMenuListener(action, callback) {
    if (window.electronAPI.removeMenuListener) window.electronAPI.removeMenuListener(action, callback);
  }
  sendLog(level, args) {
    if (window.electronAPI.sendLog) window.electronAPI.sendLog(level, args);
  }
}

/**
 * Web Backend - standalone web implementation
 * Used when running in browser without Electron
 */
class WebBackend {
  constructor(options = {}) {
    this.platform = 'web';
    this.isElectron = false;
    this.isWeb = true;
    this.apiBase = options.apiBase || '/api';
  }

  async getDocumentTypes() {
    try {
      const response = await fetch(`${this.apiBase}/document-types`);
      return response.ok ? await response.json() : [];
    } catch (err) {
      console.error('[WebBackend] Error:', err);
      return [];
    }
  }

  async getSchemaStructure(documentType) {
    try {
      const response = await fetch(`${this.apiBase}/schemas/${documentType}/structure`);
      return response.ok ? await response.json() : [];
    } catch (err) {
      console.error('[WebBackend] Error:', err);
      return [];
    }
  }

  async getCustomFormData(documentType, formName) {
    return this._request(`${this.apiBase}/schemas/${documentType}/custom-forms/${formName}`);
  }

  async createNewDocument(documentType) {
    return this._request(`${this.apiBase}/documents`, {
      method: 'POST',
      body: JSON.stringify({ documentType })
    });
  }

  async openDocumentDialog() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.mdf,.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const content = await file.text();
            resolve({ success: true, filePath: file.name, content, file });
          } catch (err) {
            resolve({ success: false, error: err.message });
          }
        } else {
          resolve({ success: false });
        }
      };
      input.click();
    });
  }

  async loadDocument(filePathOrContent) {
    if (typeof filePathOrContent === 'object' && filePathOrContent.content) {
      return this._request(`${this.apiBase}/documents/parse`, {
        method: 'POST',
        body: JSON.stringify({ content: filePathOrContent.content })
      });
    }
    return this._request(`${this.apiBase}/documents/${filePathOrContent}`);
  }

  async saveDocumentDialog(isExport, defaultPath) {
    const ext = isExport ? 'json' : 'mdf';
    return { success: true, filePath: defaultPath || `document.${ext}`, isWebDownload: true };
  }

  async saveDocument(filePath, document) {
    return this._downloadFile(filePath, JSON.stringify(document, null, 2));
  }

  async exportDocument(filePath, document) {
    return this._downloadFile(filePath, JSON.stringify(document.data, null, 2));
  }

  async validateDocument(document) {
    return this._request(`${this.apiBase}/documents/validate`, {
      method: 'POST',
      body: JSON.stringify(document)
    });
  }

  async showUnsavedChangesDialog() {
    const save = confirm('You have unsaved changes. Save them?\n\nOK = Save, Cancel = Discard');
    return { choice: save ? 0 : 1 };
  }

  async updateField(document, fieldPath, value) {
    return this._updateLocally(document, fieldPath, value);
  }

  async addArrayItem(document, arrayPath, item) {
    return this._addArrayLocally(document, arrayPath, item);
  }

  async removeArrayItem(document, arrayPath, index) {
    return this._removeArrayLocally(document, arrayPath, index);
  }

  async addComment(document, comment, sectionPath) {
    if (!document.metadata.comments) document.metadata.comments = [];
    document.metadata.comments.push({
      id: crypto.randomUUID ? crypto.randomUUID() : this._uuid(),
      timestamp: new Date().toISOString(),
      text: comment,
      sectionPath
    });
    return { success: true, document };
  }

  async configGet(key) {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage) return { success: false, error: 'localStorage not available' };
    const val = storage.getItem(`mdwriter_${key}`);
    return { success: true, value: val ? JSON.parse(val) : null };
  }

  async configSet(key, value) {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage) return { success: false, error: 'localStorage not available' };
    storage.setItem(`mdwriter_${key}`, JSON.stringify(value));
    return { success: true };
  }

  async configGetAll() {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage) return { success: false, error: 'localStorage not available' };
    const config = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key.startsWith('mdwriter_')) {
        config[key.slice(9)] = JSON.parse(storage.getItem(key));
      }
    }
    return { success: true, config };
  }

  async configGetPreference(key, defaultValue) {
    const result = await this.configGet(`pref_${key}`);
    return { success: true, value: result.value ?? defaultValue };
  }

  async configSetPreference(key, value) {
    return this.configSet(`pref_${key}`, value);
  }

  async configAddRecentFile(filePath) {
    const result = await this.configGet('recentFiles');
    let files = result.value || [];
    files = [filePath, ...files.filter(f => f !== filePath)].slice(0, 10);
    return this.configSet('recentFiles', files);
  }

  async configGetRecentFiles() {
    const result = await this.configGet('recentFiles');
    return { success: true, files: result.value || [] };
  }

  async configGetUserspaceModelsDir() {
    return { success: true, path: null };
  }

  async configSetUserspaceModelsDir() {
    return { success: false, error: 'Not supported in web mode' };
  }

  async templatesLoad(documentType) {
    return this._request(`${this.apiBase}/templates/${documentType}`);
  }

  async templatesRender(templateId, documentData, documentType) {
    return this._request(`${this.apiBase}/templates/render`, {
      method: 'POST',
      body: JSON.stringify({ templateId, documentData, documentType })
    });
  }

  async templatesCreate(documentType, name, content) {
    return this._request(`${this.apiBase}/templates`, {
      method: 'POST',
      body: JSON.stringify({ documentType, name, content })
    });
  }

  async templatesSetActive(templateId) {
    return this.configSet('activeTemplate', templateId);
  }

  async templatesGetActive() {
    const result = await this.configGet('activeTemplate');
    return { success: true, templateId: result.value };
  }

  async importCleanJSON(filePath, existingDocument) {
    return this._request(`${this.apiBase}/documents/import`, {
      method: 'POST',
      body: JSON.stringify({ 
        content: typeof filePath === 'object' ? filePath.content : filePath,
        existingDocument 
      })
    });
  }

  async updateMenuState() { return { success: true }; }
  
  async collabHostSession(document, metadata) {
    return this._request(`${this.apiBase}/collaboration/host`, {
      method: 'POST',
      body: JSON.stringify({ document, metadata })
    });
  }

  async collabStopHosting() {
    return this._request(`${this.apiBase}/collaboration/stop`, { method: 'POST' });
  }

  async collabStartDiscovery() { return { success: true }; }
  async collabStopDiscovery() { return { success: true }; }
  
  async collabGetDiscoveredSessions() {
    return this._request(`${this.apiBase}/collaboration/sessions`);
  }

  async collabGetCurrentSession() {
    return this._request(`${this.apiBase}/collaboration/current`);
  }

  onEvent() {}
  onMenuAction() {}
  removeMenuListener() {}
  sendLog(level, args) { console[level]?.(...args) || console.log(...args); }

  // Private helpers
  async _request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        return { success: false, error: err.message };
      }
      const data = await response.json();
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  _downloadFile(filename, content) {
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true, filePath: filename };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  _updateLocally(document, fieldPath, value) {
    const parts = fieldPath.split('.');
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    let current = document.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (dangerous.includes(parts[i])) return { success: false, error: 'Invalid path' };
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    
    const finalKey = parts[parts.length - 1];
    if (dangerous.includes(finalKey)) return { success: false, error: 'Invalid path' };
    
    current[finalKey] = value;
    document.metadata.modified = new Date().toISOString();
    return { success: true, document };
  }

  _addArrayLocally(document, arrayPath, item) {
    const parts = arrayPath.split('.');
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    let current = document.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (dangerous.includes(parts[i])) return { success: false, error: 'Invalid path' };
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    
    const arrayField = parts[parts.length - 1];
    if (dangerous.includes(arrayField)) return { success: false, error: 'Invalid path' };
    if (!current[arrayField]) current[arrayField] = [];
    
    current[arrayField].push(item);
    document.metadata.modified = new Date().toISOString();
    return { success: true, document };
  }

  _removeArrayLocally(document, arrayPath, index) {
    const parts = arrayPath.split('.');
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    let current = document.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (dangerous.includes(parts[i])) return { success: false, error: 'Invalid path' };
      current = current[parts[i]];
    }
    
    const arrayField = parts[parts.length - 1];
    if (dangerous.includes(arrayField)) return { success: false, error: 'Invalid path' };
    if (current[arrayField]?.length > index) {
      current[arrayField].splice(index, 1);
      document.metadata.modified = new Date().toISOString();
    }
    return { success: true, document };
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}

// ============================================================================
// Auto-initialization
// ============================================================================

/**
 * Auto-detect and register the appropriate backend
 * This runs when the script loads, but can be overridden by
 * registering a custom backend before including the editor scripts
 */
function autoInitialize() {
  // Skip if a backend is already registered (custom backend was provided)
  if (hasBackend()) {
    console.log('[MDWriter] Using pre-registered backend:', getBackend().platform);
    return;
  }

  // Auto-detect environment and register appropriate backend
  if (typeof window !== 'undefined' && window.electronAPI) {
    registerBackend(new ElectronBackend());
  } else if (typeof window !== 'undefined') {
    registerBackend(new WebBackend());
  }
}

// Run auto-initialization
autoInitialize();

// ============================================================================
// Module Exports
// ============================================================================

// Export for module environments (Node.js, bundlers)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ElectronBackend,
    WebBackend,
    registerBackend,
    getBackend,
    hasBackend,
    validateBackend,
    PlatformBackendInterface
  };
}

// Expose classes globally for external use
if (typeof window !== 'undefined') {
  window.MDWriter.ElectronBackend = ElectronBackend;
  window.MDWriter.WebBackend = WebBackend;
}
