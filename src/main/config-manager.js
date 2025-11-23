/**
 * Configuration Manager
 * 
 * Manages application configuration stored in user space.
 * Provides cross-platform paths for configuration, userspace models, and templates.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

class ConfigManager {
  constructor() {
    // Cross-platform user data directory
    this.userDataPath = app.getPath('userData');
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
      // Check if config file exists
      await fs.access(this.configPath);
      // Load existing config
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
      
      // Merge with defaults (in case new fields were added)
      this.config = this.mergeWithDefaults(this.config);
      
      console.log('[ConfigManager] Configuration loaded from:', this.configPath);
    } catch (err) {
      // Config doesn't exist, create default
      console.log('[ConfigManager] No config found, creating default');
      this.config = { ...this.defaultConfig };
      await this.save();
    }
    
    // Ensure userspace directories exist
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
      
      console.log('[ConfigManager] Configuration saved');
      return { success: true };
    } catch (err) {
      console.error('[ConfigManager] Error saving config:', err);
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
      
      console.log('[ConfigManager] Userspace directories ensured:');
      console.log('  Models:', modelsDir);
      console.log('  Templates:', templatesDir);
    } catch (err) {
      console.error('[ConfigManager] Error creating userspace directories:', err);
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

module.exports = { ConfigManager, getConfigManager };
