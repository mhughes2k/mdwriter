/**
 * Platform API Tests
 * 
 * Tests for the pluggable platform backend architecture
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Create mock window and electronAPI
let mockElectronAPI;
let mockFetch;

describe('Platform API - Pluggable Architecture', () => {
  let originalWindow;
  let originalFetch;

  beforeEach(() => {
    jest.resetModules();
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
      MDWriter: {},
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

  describe('Backend Registration', () => {
    test('should register custom backend', () => {
      const { registerBackend, getBackend } = require('../src/renderer/platform-api');
      
      const customBackend = {
        platform: 'custom',
        isElectron: false,
        isWeb: true,
        getDocumentTypes: async () => []
      };
      
      registerBackend(customBackend);
      
      expect(getBackend()).toBe(customBackend);
      expect(getBackend().platform).toBe('custom');
    });

    test('should validate backend and warn about missing methods', () => {
      const { validateBackend, PlatformBackendInterface } = require('../src/renderer/platform-api');
      
      const incompleteBackend = {
        platform: 'incomplete',
        isElectron: false,
        isWeb: true
      };
      
      const result = validateBackend(incompleteBackend);
      
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    test('should expose MDWriter global with registration functions', () => {
      require('../src/renderer/platform-api');
      
      expect(global.window.MDWriter).toBeDefined();
      expect(typeof global.window.MDWriter.registerBackend).toBe('function');
      expect(typeof global.window.MDWriter.getBackend).toBe('function');
      expect(typeof global.window.MDWriter.hasBackend).toBe('function');
    });
  });

  describe('ElectronBackend', () => {
    test('should auto-register when electronAPI is present', () => {
      const { getBackend } = require('../src/renderer/platform-api');
      
      const backend = getBackend();
      expect(backend.isElectron).toBe(true);
      expect(backend.platform).toBe('darwin');
    });

    test('should call electronAPI methods', async () => {
      const { getBackend } = require('../src/renderer/platform-api');
      const backend = getBackend();
      
      await backend.getDocumentTypes();
      expect(mockElectronAPI.getDocumentTypes).toHaveBeenCalled();
      
      await backend.getSchemaStructure('mdf');
      expect(mockElectronAPI.getSchemaStructure).toHaveBeenCalledWith('mdf');
      
      await backend.createNewDocument('mdf');
      expect(mockElectronAPI.createNewDocument).toHaveBeenCalledWith('mdf');
    });

    test('should delegate config operations to electronAPI', async () => {
      const { getBackend } = require('../src/renderer/platform-api');
      const backend = getBackend();
      
      await backend.configGet('testKey');
      expect(mockElectronAPI.configGet).toHaveBeenCalledWith('testKey');
      
      await backend.configSet('testKey', 'testValue');
      expect(mockElectronAPI.configSet).toHaveBeenCalledWith('testKey', 'testValue');
    });
  });

  describe('WebBackend', () => {
    beforeEach(() => {
      // Remove electronAPI to trigger web mode
      delete global.window.electronAPI;
      jest.resetModules();
    });

    test('should auto-register when electronAPI is absent', () => {
      const { getBackend } = require('../src/renderer/platform-api');
      
      const backend = getBackend();
      expect(backend.isWeb).toBe(true);
      expect(backend.platform).toBe('web');
    });

    test('should call fetch for API requests', async () => {
      const { getBackend } = require('../src/renderer/platform-api');
      const backend = getBackend();
      
      await backend.getDocumentTypes();
      expect(mockFetch).toHaveBeenCalledWith('/api/document-types');
      
      await backend.getSchemaStructure('mdf');
      expect(mockFetch).toHaveBeenCalledWith('/api/schemas/mdf/structure');
    });

    test('should use localStorage for config', async () => {
      global.window.localStorage.getItem.mockReturnValue('"testValue"');
      
      const { getBackend } = require('../src/renderer/platform-api');
      const backend = getBackend();
      
      const result = await backend.configGet('testKey');
      
      expect(global.window.localStorage.getItem).toHaveBeenCalledWith('mdwriter_testKey');
      expect(result.success).toBe(true);
      expect(result.value).toBe('testValue');
    });

    test('should handle menu state as no-op', async () => {
      const { getBackend } = require('../src/renderer/platform-api');
      const backend = getBackend();
      
      const result = await backend.updateMenuState({ hasDocument: true });
      
      expect(result.success).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Custom Backend Injection', () => {
    test('should allow pre-registration of custom backend', () => {
      // Simulate a custom platform registering before module loads
      global.window.MDWriter = {
        _preRegisteredBackend: {
          platform: 'my-custom-platform',
          isElectron: false,
          isWeb: true,
          getDocumentTypes: jest.fn().mockResolvedValue([{ name: 'custom-doc' }])
        }
      };
      
      // Register before requiring module
      const customBackend = global.window.MDWriter._preRegisteredBackend;
      
      const { registerBackend, getBackend } = require('../src/renderer/platform-api');
      registerBackend(customBackend);
      
      expect(getBackend().platform).toBe('my-custom-platform');
    });

    test('should expose backend classes for extension', () => {
      const { ElectronBackend, WebBackend } = require('../src/renderer/platform-api');
      
      expect(ElectronBackend).toBeDefined();
      expect(WebBackend).toBeDefined();
      
      // Can create instances
      delete global.window.electronAPI;
      const webInstance = new WebBackend({ apiBase: '/custom-api' });
      expect(webInstance.apiBase).toBe('/custom-api');
    });
  });

  describe('Local Document Operations (WebBackend)', () => {
    let backend;

    beforeEach(() => {
      delete global.window.electronAPI;
      jest.resetModules();
      const { getBackend } = require('../src/renderer/platform-api');
      backend = getBackend();
    });

    test('should update nested field safely', async () => {
      const doc = {
        metadata: { modified: null },
        data: { title: 'Original' }
      };

      const result = await backend.updateField(doc, 'title', 'Updated');

      expect(result.success).toBe(true);
      expect(result.document.data.title).toBe('Updated');
      expect(result.document.metadata.modified).toBeDefined();
    });

    test('should reject prototype pollution attempts', async () => {
      const doc = {
        metadata: { modified: null },
        data: {}
      };

      const result = await backend.updateField(doc, '__proto__.polluted', 'malicious');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    test('should add array items', async () => {
      const doc = {
        metadata: { modified: null },
        data: { items: ['a', 'b'] }
      };

      const result = await backend.addArrayItem(doc, 'items', 'c');

      expect(result.success).toBe(true);
      expect(result.document.data.items).toEqual(['a', 'b', 'c']);
    });

    test('should remove array items', async () => {
      const doc = {
        metadata: { modified: null },
        data: { items: ['a', 'b', 'c'] }
      };

      const result = await backend.removeArrayItem(doc, 'items', 1);

      expect(result.success).toBe(true);
      expect(result.document.data.items).toEqual(['a', 'c']);
    });
  });
});
