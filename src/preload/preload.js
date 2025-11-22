const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  loadDocument: (filePath) => ipcRenderer.invoke('load-document', filePath),
  saveDocument: (filePath, data) => ipcRenderer.invoke('save-document', filePath, data),
  validateDocument: (documentType, data) => ipcRenderer.invoke('validate-document', documentType, data),
  
  // Platform information
  platform: process.platform,
  
  // Event listeners for collaboration features (future)
  onDocumentUpdate: (callback) => ipcRenderer.on('document-update', callback),
  onUserJoined: (callback) => ipcRenderer.on('user-joined', callback),
  onUserLeft: (callback) => ipcRenderer.on('user-left', callback)
});
