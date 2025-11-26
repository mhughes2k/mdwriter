/**
 * Configuration Manager
 * 
 * Manages application configuration stored in user space.
 * Provides cross-platform paths for configuration, userspace models, and templates.
 */

let app;
const path = require('path');
const logger = require('./logger');
try {
  // electron may not be available in test environments; gracefully fall back
  // to a minimal shim using os.homedir()
  ({ app } = require('electron'));
} catch (err) {
  app = {
    getPath: (name) => {
      const os = require('os');
      if (name === 'userData') {
        return path.join(os.homedir(), '.mdwriter');
      }
      return os.homedir();
    }
  };
}
const fs = require('fs').promises;

class ConfigManager {
  constructor() {
    // Cross-platform user data directory
    // app.getPath may exist but return undefined in some test mocks; ensure a safe fallback
    let userDataPath;
    try {
      userDataPath = app && typeof app.getPath === 'function' ? app.getPath('userData') : null;
    } catch (err) {
      userDataPath = null;
    }
    if (!userDataPath) {
      const os = require('os');
      userDataPath = path.join(os.homedir(), '.mdwriter');
    }
    this.userDataPath = userDataPath;
    this.configPath = path.join(this.userDataPath, 'config.json');
    
    // Default configuration
    this.defaultConfig = {
      version: '1.0',
      userspace: {
        modelsDirectory: path.join(this.userDataPath, 'models'),
        templatesDirectory: path.join(this.userDataPath, 'templates')
      },
      preferences: {
        autoSave: false,
        autoSaveInterval: 30000, // 30 seconds
        recentFiles: [],
        maxRecentFiles: 10,
        activeTemplate: null, // Currently selected template
        markdownEditorViewMode: 'split' // 'edit', 'preview', or 'split'
      },
      collaboration: {
        defaultUserName: '',
        autoDiscovery: true
      }
    };
    
    this.config = null;
  }
  
  /**
   * Initialize configuration - load or create default
   */
  async initialize() {
    try {
      await fs.access(this.configPath);
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      this.config = this.mergeWithDefaults(this.config);
      logger.info('[ConfigManager] Configuration loaded from:', this.configPath);
    } catch (err) {
      logger.info('[ConfigManager] No config found, creating default');
      this.config = { ...this.defaultConfig };
      await this.save();
    }
    await this.ensureUserspaceDirs();
    return this.config;
  }
  
  /**
   * Merge loaded config with defaults to add any new fields
   */
  mergeWithDefaults(loadedConfig) {
    return {
      ...this.defaultConfig,
      ...loadedConfig,
      userspace: {
        ...this.defaultConfig.userspace,
        ...(loadedConfig.userspace || {})
      },
      preferences: {
        ...this.defaultConfig.preferences,
        ...(loadedConfig.preferences || {})
      },
      collaboration: {
        ...this.defaultConfig.collaboration,
        ...(loadedConfig.collaboration || {})
      }
    };
  }
  
  /**
   * Save configuration to disk
   */
  async save() {
    try {
      // Ensure user data directory exists
      await fs.mkdir(this.userDataPath, { recursive: true });
      
      // Write config file
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
      
      logger.info('[ConfigManager] Configuration saved');
      return { success: true };
    } catch (err) {
      logger.error('[ConfigManager] Error saving config:', err);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Get configuration value
   */
  get(key) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return undefined;
    }
    
    return value;
  }
  
  /**
   * Set configuration value
   */
  async set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    
    // Navigate to parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }
    
    // Set the value
    current[keys[keys.length - 1]] = value;
    
    // Save to disk
    return await this.save();
  }
  
  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }
  
  /**
   * Ensure userspace directories exist
   */
  async ensureUserspaceDirs() {
    try {
      const modelsDir = this.config.userspace.modelsDirectory;
      const templatesDir = this.config.userspace.templatesDirectory;
      
      await fs.mkdir(modelsDir, { recursive: true });
      await fs.mkdir(templatesDir, { recursive: true });
      
      logger.info('[ConfigManager] Userspace directories ensured:');
      logger.info('  Models:', modelsDir);
      logger.info('  Templates:', templatesDir);
    } catch (err) {
      logger.error('[ConfigManager] Error creating userspace directories:', err);
    }
  }
  
  /**
   * Get userspace models directory
   */
  getUserspaceModelsDirectory() {
    return this.config.userspace.modelsDirectory;
  }
  
  /**
   * Set userspace models directory
   */
  async setUserspaceModelsDirectory(dirPath) {
    await this.set('userspace.modelsDirectory', dirPath);
    await this.ensureUserspaceDirs();
  }
  
  /**
   * Get userspace templates directory
   */
  getUserspaceTemplatesDirectory() {
    return this.config.userspace.templatesDirectory;
  }
  
  /**
   * Set userspace templates directory
   */
  async setUserspaceTemplatesDirectory(dirPath) {
    await this.set('userspace.templatesDirectory', dirPath);
    await this.ensureUserspaceDirs();
  }
  
  /**
   * Add recent file
   */
  async addRecentFile(filePath) {
    let recentFiles = this.config.preferences.recentFiles || [];
    
    // Remove if already exists
    recentFiles = recentFiles.filter(f => f !== filePath);
    
    // Add to beginning
    recentFiles.unshift(filePath);
    
    // Limit to max
    const maxRecent = this.config.preferences.maxRecentFiles;
    if (recentFiles.length > maxRecent) {
      recentFiles = recentFiles.slice(0, maxRecent);
    }
    
    return await this.set('preferences.recentFiles', recentFiles);
  }

  /**
   * Remove a file from recent files
   */
  async removeRecentFile(filePath) {
    let recentFiles = this.config.preferences.recentFiles || [];
    recentFiles = recentFiles.filter(f => f !== filePath);
    this.config.preferences.recentFiles = recentFiles;
    await this.save();
  }
  
  /**
   * Get recent files
   */
  getRecentFiles() {
    return this.config.preferences.recentFiles || [];
  }
  
  /**
   * Set active template
   */
  async setActiveTemplate(templatePath) {
    return await this.set('preferences.activeTemplate', templatePath);
  }
  
  /**
   * Get active template
   */
  getActiveTemplate() {
    return this.config.preferences.activeTemplate;
  }
  
  /**
   * Get a specific preference value
   */
  async getPreference(key, defaultValue = null) {
    const preferences = this.config.preferences || {};
    return preferences[key] !== undefined ? preferences[key] : defaultValue;
  }

  /**
   * Synchronous getPreference for test compatibility
   */
  getPreferenceSync(key, defaultValue = null) {
    const preferences = this.config.preferences || {};
    return preferences[key] !== undefined ? preferences[key] : defaultValue;
  }
  
  /**
   * Set a specific preference value
   */
  async setPreference(key, value) {
    if (!this.config.preferences) {
      this.config.preferences = {};
    }
    this.config.preferences[key] = value;
    await this.save();
  }
}

// Singleton instance
let configManager = null;

function getConfigManager() {
  if (!configManager) {
    configManager = new ConfigManager();
  }
  return configManager;
}

module.exports = ConfigManager;
module.exports.getConfigManager = getConfigManager;
module.exports.ConfigManager = ConfigManager;
