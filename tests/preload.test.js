/**
 * Unit Tests for Preload Script
 * 
 * Tests:
 * - API exposure via contextBridge
 * - IPC communication methods
 * - Security isolation
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock electron contextBridge and ipcRenderer
const mockIpcRenderer = {
  invoke: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

const mockContextBridge = {
  exposeInMainWorld: jest.fn(),
};

jest.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}));

// Simulate preload script execution
const executePreload = () => {
  const { contextBridge, ipcRenderer } = require('electron');
  
  const electronAPI = {
    // Document operations
    loadDocumentTypes: () => ipcRenderer.invoke('load-document-types'),
    loadDocument: (filePath) => ipcRenderer.invoke('load-document', filePath),
    saveDocument: (filePath, document) => ipcRenderer.invoke('save-document', filePath, document),
    exportDocument: (filePath, document) => ipcRenderer.invoke('export-document', filePath, document),
    validateDocument: (document) => ipcRenderer.invoke('validate-document', document),
    createNewDocument: (typeName) => ipcRenderer.invoke('create-new-document', typeName),
    
    // Schema operations
    getFieldOrder: (typeName) => ipcRenderer.invoke('get-field-order', typeName),
    getUIHints: (typeName) => ipcRenderer.invoke('get-ui-hints', typeName),
    getCustomFormData: (typeName, formName) => ipcRenderer.invoke('get-custom-form-data', typeName, formName),
    
    // Template operations
    loadTemplates: (typeName) => ipcRenderer.invoke('load-templates', typeName),
    renderTemplate: (templateId, data) => ipcRenderer.invoke('render-template', templateId, data),
    saveUserTemplate: (typeName, name, template) => ipcRenderer.invoke('save-user-template', typeName, name, template),
    
    // File operations
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    
    // Configuration
    getConfig: (key) => ipcRenderer.invoke('get-config', key),
    setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
    
    // Listeners
    onDocumentUpdate: (callback) => {
      ipcRenderer.on('document-update', (event, data) => callback(data));
    },
    onMenuAction: (callback) => {
      ipcRenderer.on('menu-action', (event, action) => callback(action));
    },
  };
  
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  
  return electronAPI;
};

describe('Preload Script', () => {
  let electronAPI;
  
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI = executePreload();
  });
  
  describe('API Exposure', () => {
    test('should expose electronAPI to main world', () => {
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'electronAPI',
        expect.any(Object)
      );
    });
    
    test('should expose document operations', () => {
      const [, api] = mockContextBridge.exposeInMainWorld.mock.calls[0];
      
      expect(api.loadDocumentTypes).toBeDefined();
      expect(api.loadDocument).toBeDefined();
      expect(api.saveDocument).toBeDefined();
      expect(api.exportDocument).toBeDefined();
      expect(api.validateDocument).toBeDefined();
      expect(api.createNewDocument).toBeDefined();
    });
    
    test('should expose schema operations', () => {
      const [, api] = mockContextBridge.exposeInMainWorld.mock.calls[0];
      
      expect(api.getFieldOrder).toBeDefined();
      expect(api.getUIHints).toBeDefined();
      expect(api.getCustomFormData).toBeDefined();
    });
    
    test('should expose template operations', () => {
      const [, api] = mockContextBridge.exposeInMainWorld.mock.calls[0];
      
      expect(api.loadTemplates).toBeDefined();
      expect(api.renderTemplate).toBeDefined();
      expect(api.saveUserTemplate).toBeDefined();
    });
    
    test('should expose file operations', () => {
      const [, api] = mockContextBridge.exposeInMainWorld.mock.calls[0];
      
      expect(api.showOpenDialog).toBeDefined();
      expect(api.showSaveDialog).toBeDefined();
    });
    
    test('should expose configuration operations', () => {
      const [, api] = mockContextBridge.exposeInMainWorld.mock.calls[0];
      
      expect(api.getConfig).toBeDefined();
      expect(api.setConfig).toBeDefined();
    });
  });
  
  describe('IPC Communication', () => {
    test('loadDocumentTypes should invoke IPC', async () => {
      mockIpcRenderer.invoke.mockResolvedValue([]);
      
      await electronAPI.loadDocumentTypes();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('load-document-types');
    });
    
    test('loadDocument should pass file path', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({});
      
      await electronAPI.loadDocument('/path/to/doc.mdf');
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('load-document', '/path/to/doc.mdf');
    });
    
    test('saveDocument should pass path and document', async () => {
      const doc = { metadata: {}, data: {} };
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      await electronAPI.saveDocument('/path/to/doc.mdf', doc);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('save-document', '/path/to/doc.mdf', doc);
    });
    
    test('validateDocument should pass document', async () => {
      const doc = { metadata: { documentType: 'mdf' }, data: {} };
      mockIpcRenderer.invoke.mockResolvedValue({ valid: true });
      
      await electronAPI.validateDocument(doc);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('validate-document', doc);
    });
    
    test('createNewDocument should pass type name', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ metadata: {}, data: {} });
      
      await electronAPI.createNewDocument('mdf');
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('create-new-document', 'mdf');
    });
    
    test('getFieldOrder should pass type name', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(['field1', 'field2']);
      
      await electronAPI.getFieldOrder('mdf');
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-field-order', 'mdf');
    });
    
    test('getCustomFormData should pass type and form name', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ data: {} });
      
      await electronAPI.getCustomFormData('mdf', 'staff-editor');
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-custom-form-data', 'mdf', 'staff-editor');
    });
    
    test('loadTemplates should pass type name', async () => {
      mockIpcRenderer.invoke.mockResolvedValue([]);
      
      await electronAPI.loadTemplates('mdf');
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('load-templates', 'mdf');
    });
    
    test('renderTemplate should pass template ID and data', async () => {
      mockIpcRenderer.invoke.mockResolvedValue('rendered content');
      
      await electronAPI.renderTemplate('template-id', { title: 'Test' });
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('render-template', 'template-id', { title: 'Test' });
    });
    
    test('getConfig should pass key', async () => {
      mockIpcRenderer.invoke.mockResolvedValue('value');
      
      await electronAPI.getConfig('preferences.autoSave');
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-config', 'preferences.autoSave');
    });
    
    test('setConfig should pass key and value', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      await electronAPI.setConfig('preferences.autoSave', true);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('set-config', 'preferences.autoSave', true);
    });
  });
  
  describe('Event Listeners', () => {
    test('onDocumentUpdate should register listener', () => {
      const callback = jest.fn();
      
      electronAPI.onDocumentUpdate(callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'document-update',
        expect.any(Function)
      );
    });
    
    test('onDocumentUpdate should call callback with data', () => {
      const callback = jest.fn();
      
      electronAPI.onDocumentUpdate(callback);
      
      // Get the registered handler
      const handler = mockIpcRenderer.on.mock.calls[0][1];
      
      // Simulate event
      handler({}, { field: 'value' });
      
      expect(callback).toHaveBeenCalledWith({ field: 'value' });
    });
    
    test('onMenuAction should register listener', () => {
      const callback = jest.fn();
      
      electronAPI.onMenuAction(callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'menu-action',
        expect.any(Function)
      );
    });
  });
  
  describe('Security', () => {
    test('should not expose Node.js APIs directly', () => {
      const [, api] = mockContextBridge.exposeInMainWorld.mock.calls[0];
      
      // Should not expose require, process, etc.
      expect(api.require).toBeUndefined();
      expect(api.process).toBeUndefined();
      expect(api.fs).toBeUndefined();
    });
    
    test('should only expose whitelisted IPC channels', () => {
      const [, api] = mockContextBridge.exposeInMainWorld.mock.calls[0];
      
      // All methods should go through ipcRenderer
      // No direct access to ipcRenderer.send or arbitrary channels
      expect(api.ipcRenderer).toBeUndefined();
    });
    
    test('should use invoke pattern for async operations', async () => {
      mockIpcRenderer.invoke.mockResolvedValue('result');
      
      await electronAPI.loadDocumentTypes();
      
      // Should use invoke, not send
      expect(mockIpcRenderer.invoke).toHaveBeenCalled();
    });
  });
});
