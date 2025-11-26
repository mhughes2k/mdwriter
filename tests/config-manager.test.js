const { describe, test, expect, beforeEach } = require('@jest/globals');
let ConfigManager;
let fs;
let configManager;

// Mock electron app
const mockApp = {
  getPath: jest.fn((name) => {
    const paths = {
      userData: '/mock/userdata',
      appData: '/mock/appdata',
    };
    return paths[name] || '/mock/default';
  }),
};

// Mock electron before any imports
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name) => {
      const paths = {
        userData: '/mock/userdata',
        appData: '/mock/appdata',
      };
      return paths[name] || '/mock/default';
    }),
  },
}));

// Mock filesystem before any imports
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe('ConfigManager', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    fs = require('fs').promises;
    ConfigManager = require('../src/main/config-manager').ConfigManager;
    configManager = new ConfigManager();
  });

  describe('Constructor', () => {
    test('should set user data path from electron', () => {
      expect(configManager.userDataPath).toBe('/mock/userdata');
    });
    test('should set config file path', () => {
      expect(configManager.configPath).toContain('config.json');
    });
    test('should define default configuration', () => {
      expect(configManager.defaultConfig).toBeDefined();
      expect(configManager.defaultConfig.version).toBe('1.0');
      expect(configManager.defaultConfig.userspace).toBeDefined();
      expect(configManager.defaultConfig.preferences).toBeDefined();
    });
  });

  describe('initialize', () => {
    test('should load existing configuration', async () => {
      const existingConfig = {
        version: '1.0',
        userspace: {
          modelsDirectory: '/custom/models',
          templatesDirectory: '/custom/templates'
        },
        preferences: {
          autoSave: true,
          recentFiles: ['/file1.mdf', '/file2.mdf']
        }
      };
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      fs.mkdir.mockResolvedValue();
      const config = await configManager.initialize();
      expect(config.userspace.modelsDirectory).toBe('/custom/models');
      expect(config.preferences.autoSave).toBe(true);
    });
    test('should create default config if none exists', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));
      fs.writeFile.mockResolvedValue();
      fs.mkdir.mockResolvedValue();
      const config = await configManager.initialize();
      expect(config.version).toBe('1.0');
      expect(config.userspace).toBeDefined();
      expect(fs.writeFile).toHaveBeenCalled();
    });
    test('should merge loaded config with defaults', async () => {
      const partialConfig = {
        version: '1.0',
        userspace: {
          modelsDirectory: '/custom/models'
        }
      };
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(partialConfig));
      fs.mkdir.mockResolvedValue();
      const config = await configManager.initialize();
      expect(config.userspace.modelsDirectory).toBe('/custom/models');
      expect(config.preferences).toBeDefined();
      expect(config.preferences.autoSave).toBe(false);
    });
    test('should ensure userspace directories exist', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));
      fs.writeFile.mockResolvedValue();
      fs.mkdir.mockResolvedValue();
      await configManager.initialize();
      expect(fs.mkdir).toHaveBeenCalled();
    });
  });

  describe('save', () => {
    test('should save configuration to disk', async () => {
      configManager.config = {
        version: '1.0',
        userspace: {},
        preferences: {}
      };
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      const result = await configManager.save();
      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.any(String),
        'utf-8'
      );
      const savedContent = fs.writeFile.mock.calls[0][1];
      expect(savedContent).toContain('\n');
      expect(savedContent).toContain('  ');
    });
    test('should handle save errors', async () => {
      configManager.config = { version: '1.0' };
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('Disk full'));
      const result = await configManager.save();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Disk full');
    });
  });

  describe('get', () => {
    beforeEach(() => {
      configManager.config = {
        version: '1.0',
        userspace: {
          modelsDirectory: '/models'
        },
        preferences: {
          autoSave: true,
          recentFiles: ['/file1.mdf']
        }
      };
    });
    test('should get top-level config value', () => {
      const value = configManager.get('version');
      expect(value).toBe('1.0');
    });
    test('should get nested config value', () => {
      const value = configManager.get('userspace.modelsDirectory');
      expect(value).toBe('/models');
    });
    test('should get deeply nested value', () => {
      const value = configManager.get('preferences.autoSave');
      expect(value).toBe(true);
    });
    test('should return undefined for missing key', () => {
      const value = configManager.get('nonexistent.key');
      expect(value).toBeUndefined();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      configManager.config = {
        version: '1.0',
        userspace: {},
        preferences: {}
      };
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });
    test('should set top-level config value', async () => {
      await configManager.set('version', '2.0');
      expect(configManager.config.version).toBe('2.0');
    });
    test('should set nested config value', async () => {
      await configManager.set('preferences.autoSave', true);
      expect(configManager.config.preferences.autoSave).toBe(true);
    });
    test('should create nested objects if needed', async () => {
      await configManager.set('new.nested.value', 'test');
      expect(configManager.config.new.nested.value).toBe('test');
    });
    test('should save after setting value', async () => {
      await configManager.set('preferences.autoSave', true);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('getUserspaceModelsDirectory', () => {
    test('should return models directory path', () => {
      configManager.config = {
        userspace: {
          modelsDirectory: '/custom/models'
        }
      };
      const path = configManager.getUserspaceModelsDirectory();
      expect(path).toBe('/custom/models');
    });
  });

  describe('getUserspaceTemplatesDirectory', () => {
    test('should return templates directory path', () => {
      configManager.config = {
        userspace: {
          templatesDirectory: '/custom/templates'
        }
      };
      const path = configManager.getUserspaceTemplatesDirectory();
      expect(path).toBe('/custom/templates');
    });
  });

  describe('addRecentFile', () => {
    beforeEach(() => {
      configManager.config = {
        preferences: {
          recentFiles: [],
          maxRecentFiles: 3
        }
      };
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });
    test('should add file to recent files', async () => {
      await configManager.addRecentFile('/path/to/file.mdf');
      expect(configManager.config.preferences.recentFiles).toContain('/path/to/file.mdf');
    });
    test('should move existing file to top', async () => {
      configManager.config.preferences.recentFiles = ['/file1.mdf', '/file2.mdf'];
      await configManager.addRecentFile('/file1.mdf');
      expect(configManager.config.preferences.recentFiles[0]).toBe('/file1.mdf');
      expect(configManager.config.preferences.recentFiles).toHaveLength(2);
    });
    test('should limit recent files to max', async () => {
      configManager.config.preferences.recentFiles = ['/file1.mdf', '/file2.mdf', '/file3.mdf'];
      await configManager.addRecentFile('/file4.mdf');
      // Implementation keeps newest at front, truncates tail; /file3.mdf should be removed
      expect(configManager.config.preferences.recentFiles).toHaveLength(3);
      expect(configManager.config.preferences.recentFiles[0]).toBe('/file4.mdf');
      expect(configManager.config.preferences.recentFiles).not.toContain('/file3.mdf');
    });
  });

  describe('removeRecentFile', () => {
    beforeEach(() => {
      configManager.config = {
        preferences: {
          recentFiles: ['/file1.mdf', '/file2.mdf', '/file3.mdf']
        }
      };
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });
    test('should remove file from recent files', async () => {
      await configManager.removeRecentFile('/file2.mdf');
      expect(configManager.config.preferences.recentFiles).not.toContain('/file2.mdf');
      expect(configManager.config.preferences.recentFiles).toHaveLength(2);
    });
    test('should handle removing non-existent file', async () => {
      await configManager.removeRecentFile('/nonexistent.mdf');
      expect(configManager.config.preferences.recentFiles).toHaveLength(3);
    });
  });

  describe('getPreference', () => {
    test('should get preference value', () => {
      configManager.config = {
        preferences: {
          autoSave: true,
          autoSaveInterval: 30000
        }
      };
      expect(configManager.getPreferenceSync('autoSave')).toBe(true);
      expect(configManager.getPreferenceSync('autoSaveInterval')).toBe(30000);
    });
  });

  describe('setPreference', () => {
    beforeEach(() => {
      configManager.config = {
        preferences: {}
      };
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });
    test('should set preference value', async () => {
      await configManager.setPreference('autoSave', true);
      expect(configManager.config.preferences.autoSave).toBe(true);
    });
  });
});
