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
  onCollabSessionLost: (callback) => ipcRenderer.on('collab-session-lost', callback)
});
