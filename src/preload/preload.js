const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Document type operations
  getDocumentTypes: () => ipcRenderer.invoke('get-document-types'),
  getSchemaStructure: (documentType) => ipcRenderer.invoke('get-schema-structure', documentType),
  getCustomFormData: (documentType, formName) => ipcRenderer.invoke('get-custom-form-data', documentType, formName),
  
  // Document operations
  createNewDocument: (documentType) => ipcRenderer.invoke('create-new-document', documentType),
  openDocumentDialog: () => ipcRenderer.invoke('open-document-dialog'),
  loadDocument: (filePath) => ipcRenderer.invoke('load-document', filePath),
  saveDocumentDialog: (isExport, defaultPath) => ipcRenderer.invoke('save-document-dialog', isExport, defaultPath),
  saveDocument: (filePath, document) => ipcRenderer.invoke('save-document', filePath, document),
  exportDocument: (filePath, document) => ipcRenderer.invoke('export-document', filePath, document),
  validateDocument: (document) => ipcRenderer.invoke('validate-document', document),
  
  // Document editing
  updateField: (document, fieldPath, value) => ipcRenderer.invoke('update-field', document, fieldPath, value),
  addArrayItem: (document, arrayPath, item) => ipcRenderer.invoke('add-array-item', document, arrayPath, item),
  removeArrayItem: (document, arrayPath, index) => ipcRenderer.invoke('remove-array-item', document, arrayPath, index),
  addComment: (document, comment, sectionPath) => ipcRenderer.invoke('add-comment', document, comment, sectionPath),
  
  // Platform information
  platform: process.platform,
  
  // Collaboration operations
  collabHostSession: (document, metadata) => ipcRenderer.invoke('collab-host-session', document, metadata),
  collabStopHosting: () => ipcRenderer.invoke('collab-stop-hosting'),
  collabStartDiscovery: () => ipcRenderer.invoke('collab-start-discovery'),
  collabStopDiscovery: () => ipcRenderer.invoke('collab-stop-discovery'),
  collabGetDiscoveredSessions: () => ipcRenderer.invoke('collab-get-discovered-sessions'),
  collabGetCurrentSession: () => ipcRenderer.invoke('collab-get-current-session'),
  
  // Event listeners for collaboration features
  onDocumentUpdate: (callback) => ipcRenderer.on('document-update', callback),
  onUserJoined: (callback) => ipcRenderer.on('user-joined', callback),
  onUserLeft: (callback) => ipcRenderer.on('user-left', callback),
  onCollabSessionFound: (callback) => ipcRenderer.on('collab-session-found', callback),
  onCollabSessionLost: (callback) => ipcRenderer.on('collab-session-lost', callback),
  
  // Configuration operations
  configGet: (key) => ipcRenderer.invoke('config-get', key),
  configSet: (key, value) => ipcRenderer.invoke('config-set', key, value),
  configGetAll: () => ipcRenderer.invoke('config-get-all'),
  configGetPreference: (key, defaultValue) => ipcRenderer.invoke('config-get-preference', key, defaultValue),
  configSetPreference: (key, value) => ipcRenderer.invoke('config-set-preference', key, value),
  configAddRecentFile: (filePath) => ipcRenderer.invoke('config-add-recent-file', filePath),
  configGetRecentFiles: () => ipcRenderer.invoke('config-get-recent-files'),
  configGetUserspaceModelsDir: () => ipcRenderer.invoke('config-get-userspace-models-dir'),
  configSetUserspaceModelsDir: (dirPath) => ipcRenderer.invoke('config-set-userspace-models-dir', dirPath),
  
  // Template operations
  templatesLoad: (documentType) => ipcRenderer.invoke('templates-load', documentType),
  templatesRender: (templateId, documentData, documentType) => ipcRenderer.invoke('templates-render', templateId, documentData, documentType),
  templatesCreate: (documentType, name, content) => ipcRenderer.invoke('templates-create', documentType, name, content),
  templatesSetActive: (templateId) => ipcRenderer.invoke('templates-set-active', templateId),
  templatesGetActive: () => ipcRenderer.invoke('templates-get-active'),

  // Import clean JSON
  importCleanJSON: (filePath, existingDocument) => ipcRenderer.invoke('import-clean-json', filePath, existingDocument),
  
  // Menu state management
  updateMenuState: (state) => ipcRenderer.invoke('update-menu-state', state),
  
  // Menu action listeners
  onMenuAction: (action, callback) => ipcRenderer.on(action, callback),
  removeMenuListener: (action, callback) => ipcRenderer.removeListener(action, callback)
  ,
  // Renderer -> Main logging helper
  sendLog: (level, args) => ipcRenderer.send('renderer-log', { level, args })
});
