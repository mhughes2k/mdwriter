/**
 * Platform API Tests
 * 
 * Tests for the platform abstraction layer
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Create mock window and electronAPI
let mockElectronAPI;
let mockFetch;

describe('PlatformAPI', () => {
  let PlatformAPI;
  let originalWindow;
  let originalFetch;

  beforeEach(() => {
    // Reset modules to ensure fresh state
    jest.resetModules();
    
    // Save original window if it exists
    originalWindow = global.window;
    originalFetch = global.fetch;
    
    // Create mock electronAPI
    mockElectronAPI = {
      platform: 'darwin',
      getDocumentTypes: jest.fn().mockResolvedValue([{ name: 'mdf' }]),
      getSchemaStructure: jest.fn().mockResolvedValue([{ name: 'title', type: 'string' }]),
      createNewDocument: jest.fn().mockResolvedValue({ success: true, document: {} }),
      loadDocument: jest.fn().mockResolvedValue({ success: true, document: {} }),
      saveDocument: jest.fn().mockResolvedValue({ success: true }),
      validateDocument: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
      configGet: jest.fn().mockResolvedValue({ success: true, value: 'test' }),
      configSet: jest.fn().mockResolvedValue({ success: true }),
      updateMenuState: jest.fn().mockResolvedValue({ success: true })
    };

    // Create mock window
    global.window = {
      electronAPI: mockElectronAPI,
      platformAPI: null,
      localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        length: 0,
        key: jest.fn()
      }
    };
    
    // Mock fetch
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.window = originalWindow;
    global.fetch = originalFetch;
    jest.resetModules();
  });

  describe('Platform Detection', () => {
    test('should detect Electron environment', () => {
      // Re-require the module with electronAPI present
      const { PlatformAPI } = require('../src/renderer/platform-api');
      const api = new PlatformAPI();
      
      expect(api.isElectron).toBe(true);
      expect(api.isWeb).toBe(false);
      expect(api.platform).toBe('darwin');
    });

    test('should detect Web environment when electronAPI is missing', () => {
      // Remove electronAPI
      delete global.window.electronAPI;
      
      // Re-require the module
      jest.resetModules();
      const { PlatformAPI } = require('../src/renderer/platform-api');
      const api = new PlatformAPI();
      
      expect(api.isElectron).toBe(false);
      expect(api.isWeb).toBe(true);
      expect(api.platform).toBe('web');
    });
  });

  describe('Electron Mode Operations', () => {
    let api;

    beforeEach(() => {
      const { PlatformAPI } = require('../src/renderer/platform-api');
      api = new PlatformAPI();
    });

    test('getDocumentTypes should call electronAPI', async () => {
      await api.getDocumentTypes();
      expect(mockElectronAPI.getDocumentTypes).toHaveBeenCalled();
    });

    test('getSchemaStructure should call electronAPI with type', async () => {
      await api.getSchemaStructure('mdf');
      expect(mockElectronAPI.getSchemaStructure).toHaveBeenCalledWith('mdf');
    });

    test('createNewDocument should call electronAPI with type', async () => {
      await api.createNewDocument('mdf');
      expect(mockElectronAPI.createNewDocument).toHaveBeenCalledWith('mdf');
    });

    test('loadDocument should call electronAPI with path', async () => {
      await api.loadDocument('/path/to/doc.mdf');
      expect(mockElectronAPI.loadDocument).toHaveBeenCalledWith('/path/to/doc.mdf');
    });

    test('saveDocument should call electronAPI', async () => {
      const doc = { data: { title: 'Test' } };
      await api.saveDocument('/path/to/doc.mdf', doc);
      expect(mockElectronAPI.saveDocument).toHaveBeenCalledWith('/path/to/doc.mdf', doc);
    });

    test('validateDocument should call electronAPI', async () => {
      const doc = { metadata: { documentType: 'mdf' }, data: {} };
      await api.validateDocument(doc);
      expect(mockElectronAPI.validateDocument).toHaveBeenCalledWith(doc);
    });

    test('configGet should call electronAPI', async () => {
      await api.configGet('testKey');
      expect(mockElectronAPI.configGet).toHaveBeenCalledWith('testKey');
    });

    test('configSet should call electronAPI', async () => {
      await api.configSet('testKey', 'testValue');
      expect(mockElectronAPI.configSet).toHaveBeenCalledWith('testKey', 'testValue');
    });

    test('updateMenuState should call electronAPI', async () => {
      await api.updateMenuState({ hasDocument: true });
      expect(mockElectronAPI.updateMenuState).toHaveBeenCalledWith({ hasDocument: true });
    });
  });

  describe('Web Mode Operations', () => {
    let api;

    beforeEach(() => {
      // Remove electronAPI
      delete global.window.electronAPI;
      
      // Reset modules and re-require
      jest.resetModules();
      const { PlatformAPI } = require('../src/renderer/platform-api');
      api = new PlatformAPI();
    });

    test('getDocumentTypes should call fetch', async () => {
      await api.getDocumentTypes();
      expect(mockFetch).toHaveBeenCalledWith('/api/document-types', expect.any(Object));
    });

    test('getSchemaStructure should call fetch with type', async () => {
      await api.getSchemaStructure('mdf');
      expect(mockFetch).toHaveBeenCalledWith('/api/schemas/mdf/structure', expect.any(Object));
    });

    test('createNewDocument should POST to API', async () => {
      await api.createNewDocument('mdf');
      expect(mockFetch).toHaveBeenCalledWith('/api/documents', {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ documentType: 'mdf' })
      });
    });

    test('configGet should use localStorage', async () => {
      global.window.localStorage.getItem.mockReturnValue('"testValue"');
      
      const result = await api.configGet('testKey');
      
      expect(global.window.localStorage.getItem).toHaveBeenCalledWith('mdwriter_config_testKey');
      expect(result.success).toBe(true);
      expect(result.value).toBe('testValue');
    });

    test('configSet should use localStorage', async () => {
      await api.configSet('testKey', 'testValue');
      
      expect(global.window.localStorage.setItem).toHaveBeenCalledWith(
        'mdwriter_config_testKey',
        '"testValue"'
      );
    });

    test('updateMenuState should be no-op in web mode', async () => {
      const result = await api.updateMenuState({ hasDocument: true });
      
      expect(result.success).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('showUnsavedChangesDialog should use confirm', async () => {
      global.confirm = jest.fn().mockReturnValue(true);
      
      const result = await api.showUnsavedChangesDialog();
      
      expect(global.confirm).toHaveBeenCalled();
      expect(result.choice).toBe(0); // Save
    });
  });

  describe('Local Document Operations', () => {
    let api;

    beforeEach(() => {
      delete global.window.electronAPI;
      jest.resetModules();
      const { PlatformAPI } = require('../src/renderer/platform-api');
      api = new PlatformAPI();
    });

    test('_updateFieldLocally should update nested field', () => {
      const doc = {
        metadata: { modified: null },
        data: { title: 'Original' }
      };

      const result = api._updateFieldLocally(doc, 'title', 'Updated');

      expect(result.success).toBe(true);
      expect(result.document.data.title).toBe('Updated');
      expect(result.document.metadata.modified).toBeDefined();
    });

    test('_updateFieldLocally should create nested path', () => {
      const doc = {
        metadata: { modified: null },
        data: {}
      };

      const result = api._updateFieldLocally(doc, 'nested.field', 'value');

      expect(result.success).toBe(true);
      expect(result.document.data.nested.field).toBe('value');
    });

    test('_addArrayItemLocally should add item to array', () => {
      const doc = {
        metadata: { modified: null },
        data: { items: ['a', 'b'] }
      };

      const result = api._addArrayItemLocally(doc, 'items', 'c');

      expect(result.success).toBe(true);
      expect(result.document.data.items).toEqual(['a', 'b', 'c']);
    });

    test('_addArrayItemLocally should create array if missing', () => {
      const doc = {
        metadata: { modified: null },
        data: {}
      };

      const result = api._addArrayItemLocally(doc, 'items', 'a');

      expect(result.success).toBe(true);
      expect(result.document.data.items).toEqual(['a']);
    });

    test('_removeArrayItemLocally should remove item at index', () => {
      const doc = {
        metadata: { modified: null },
        data: { items: ['a', 'b', 'c'] }
      };

      const result = api._removeArrayItemLocally(doc, 'items', 1);

      expect(result.success).toBe(true);
      expect(result.document.data.items).toEqual(['a', 'c']);
    });

    test('_generateId should generate UUID', () => {
      const id = api._generateId();

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });
});
