const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { instance: schemaLoader } = require('./schema-loader');
const DocumentManager = require('./document-manager');
const CollaborationServer = require('./collaboration-server');
const DiscoveryService = require('./discovery-service');
const { getConfigManager } = require('./config-manager');
const { TemplateManager } = require('./template-manager');
const MenuBuilder = require('./menu-builder');
const logger = require('./logger');

// Receive logs forwarded from renderer processes and emit via main logger
ipcMain.on('renderer-log', (event, payload) => {
  try {
    const { level, args } = payload || {};
    if (!level || !args) return;
    if (typeof logger[level] === 'function') {
      logger[level](...args);
    } else {
      logger.info(...args);
    }
  } catch (e) {
    // Swallow to avoid crashing main process from bad renderer log
    logger.error('[Main] Failed to forward renderer log:', e);
  }
});

let mainWindow;
let documentManager;
let currentDocument = null;
let collaborationServer = null;
let discoveryService = null;
let currentSession = null;
let configManager = null;
let templateManager = null;
let menuBuilder = null;

async function initialize() {
  // Initialize configuration
  configManager = getConfigManager();
  await configManager.initialize();
  
  // Initialize template manager
  templateManager = new TemplateManager(configManager);
  
  // Load all document types from models directory
  await schemaLoader.loadDocumentTypes();
  
  // Set userspace models directory in schema loader
  const userspaceModelsDir = configManager.getUserspaceModelsDirectory();
  schemaLoader.setUserspaceModelsDirectory(userspaceModelsDir);
  
  // Reload to include userspace models
  await schemaLoader.loadDocumentTypes();
  
  documentManager = new DocumentManager(schemaLoader);
  
  // Initialize collaboration services
  collaborationServer = new CollaborationServer();
  discoveryService = new DiscoveryService();
  
  logger.info('Application initialized');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, '../renderer/assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  mainWindow.webContents.openDevTools();

  // Prevent closing if there are unsaved changes
  mainWindow.on('close', (e) => {
    e.preventDefault(); // Always prevent default, we'll destroy manually if needed
    
    // Ask renderer if there are unsaved changes
    mainWindow.webContents.executeJavaScript('window.isModified || false')
      .then(hasUnsavedChanges => {
        if (!hasUnsavedChanges) {
          mainWindow.destroy();
          return;
        }
        
        const choice = dialog.showMessageBoxSync(mainWindow, {
          type: 'question',
          buttons: ['Save', 'Don\'t Save', 'Cancel'],
          defaultId: 0,
          cancelId: 2,
          title: 'Unsaved Changes',
          message: 'Do you want to save the changes you made?',
          detail: 'Your changes will be lost if you don\'t save them.'
        });
        
        if (choice === 0) {
          // Save
          mainWindow.webContents.executeJavaScript('window.saveDocument()')
            .then(saved => {
              if (saved) {
                mainWindow.destroy();
              }
            });
        } else if (choice === 1) {
          // Don't save
          mainWindow.destroy();
        }
        // If Cancel (choice === 2), do nothing - window stays open
      })
      .catch(err => {
        logger.error('[Main] Error checking unsaved changes:', err);
        mainWindow.destroy();
      });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    menuBuilder = null;
  });
  
  // Initialize menu builder after window is created
  menuBuilder = new MenuBuilder(mainWindow, app);
  menuBuilder.rebuild();
  
  // Update recent files in menu
  updateRecentFilesMenu();
}

async function updateRecentFilesMenu() {
  if (menuBuilder && configManager) {
    const recentFiles = configManager.getRecentFiles();
    await menuBuilder.updateRecentFiles(recentFiles);
  }
}

app.whenReady().then(async () => {
  await initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for document operations

ipcMain.handle('get-document-types', async () => {
  return Array.from(schemaLoader.documentTypes.values());
});

ipcMain.handle('get-schema-structure', async (event, documentType) => {
  try {
    logger.debug('[Main] Getting schema structure for:', documentType);
    const result = await schemaLoader.getSchemaStructure(documentType);
    logger.debug('[Main] Schema structure loaded, properties:', result?.length || 0);
    return result;
  } catch (err) {
    logger.error('[Main] Error getting schema structure:', err);
    return { error: err.message };
  }
});

ipcMain.handle('get-custom-form-data', async (event, documentType, formName) => {
  try {
    const docType = schemaLoader.getDocumentType(documentType);
    if (!docType) {
      return { error: 'Unknown document type' };
    }

    const customForm = docType.customForms[formName];
    if (!customForm) {
      return { error: 'Custom form not found' };
    }

    let data = null;
    
    // Load data source if it exists
    if (customForm.dataSource) {
      const dataPath = path.join(docType.modelPath, customForm.dataSource);
      data = JSON.parse(await require('fs').promises.readFile(dataPath, 'utf8'));
    }
    
    // Load custom form implementation if it exists
    let formImplementation = null;
    if (customForm.implementation) {
      const implPath = path.join(docType.modelPath, customForm.implementation);
      try {
        formImplementation = await require('fs').promises.readFile(implPath, 'utf8');
      } catch (err) {
        logger.warn('Custom form implementation not found:', implPath);
      }
    }
    
    return { 
      success: true, 
      data, 
      formType: customForm.type,
      implementation: formImplementation
    };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('create-new-document', async (event, documentType) => {
  try {
    currentDocument = await documentManager.createNew(documentType);
    return { success: true, document: currentDocument };
  } catch (err) {
    const isModelFault = err.isModelFault || err.code === 'MODEL_DEFINITION_FAULT';
    if (isModelFault) {
      logger.error(`[Main] Model definition fault for type "${documentType}": ${err.message}`);
    }
    return { 
      success: false, 
      error: err.message,
      isModelFault: isModelFault
    };
  }
});

ipcMain.handle('open-document-dialog', async () => {
  // Build file filters dynamically from all registered document types
  const filters = [];
  
  const allSupportedExtensions = [];
  for (const [typeName, docType] of schemaLoader.documentTypes) {
    filters.push({
      name: docType.description || typeName,
      extensions: docType.extensions
    });
    allSupportedExtensions.push(...docType.extensions);
  }
  console.log('All supported extensions for open dialog:', allSupportedExtensions);
  // Combine all Supported extensions into one filter
  const allFileFilter = {
    name: 'All Supported Files',
    extensions: Array.from(new Set(allSupportedExtensions))
  };

  filters.unshift(allFileFilter);
  
  // Add common filters
  filters.push(
    { name: 'JSON Files', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] }
  );
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, filePath: result.filePaths[0] };
  }
  
  return { success: false };
});

ipcMain.handle('load-document', async (event, filePath) => {
  try {
    console.log('[Main] Loading document:', filePath);
    currentDocument = await documentManager.load(filePath);
    console.log('[Main] Document loaded successfully');
    
    // Validate after loading
    console.log('[Main] Validating document...');
    const validation = await documentManager.validate(currentDocument);
    console.log('[Main] Validation complete:', validation.valid ? 'valid' : `${validation.errors.length} errors`);
    if (!validation.valid && validation.errors.length > 0) {
      console.log('[Main] First validation error:', JSON.stringify(validation.errors[0], null, 2));
    }
    
    return { 
      success: true, 
      document: currentDocument,
      validation 
    };
  } catch (err) {
    console.error('[Main] Error loading document:', err);
    const isModelFault = err.isModelFault || err.code === 'MODEL_DEFINITION_FAULT';
    if (isModelFault) {
      logger.error(`[Main] Model definition fault when loading document: ${err.message}`);
    }
    return { 
      success: false, 
      error: err.message,
      isModelFault: isModelFault
    };
  }
});

ipcMain.handle('save-document-dialog', async (event, isExport, defaultPath) => {
  // Build file filters dynamically from all registered document types
  const filters = [];
  
  if (isExport) {
    filters.push(
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    );
  } else {
    // Add filters for all document types
    for (const [typeName, docType] of schemaLoader.documentTypes) {
      filters.push({
        name: docType.description || typeName,
        extensions: docType.extensions
      });
    }
    filters.push({ name: 'All Files', extensions: ['*'] });
  }

  const dialogOptions = {
    properties: ['createDirectory', 'showOverwriteConfirmation'],
    filters
  };
  
  // Set default path if provided
  if (defaultPath) {
    dialogOptions.defaultPath = defaultPath;
  }

  const result = await dialog.showSaveDialog(mainWindow, dialogOptions);

  if (!result.canceled && result.filePath) {
    return { success: true, filePath: result.filePath };
  }
  
  return { success: false };
});

ipcMain.handle('save-document', async (event, filePath, document) => {
  try {
    currentDocument = document;
    const result = await documentManager.save(filePath, document);
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('export-document', async (event, filePath, document) => {
  try {
    const result = await documentManager.exportClean(filePath, document);
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('validate-document', async (event, document) => {
  try {
    const validation = await documentManager.validate(document);
    return validation;
  } catch (err) {
    const isModelFault = err.isModelFault || err.code === 'MODEL_DEFINITION_FAULT';
    if (isModelFault) {
      logger.error(`[Main] Model definition fault during validation: ${err.message}`);
    }
    return { 
      valid: false, 
      errors: [{ message: err.message }],
      isModelFault: isModelFault
    };
  }
});

ipcMain.handle('show-unsaved-changes-dialog', async (event) => {
  const choice = dialog.showMessageBoxSync(mainWindow, {
    type: 'question',
    buttons: ['Save', 'Don\'t Save', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved Changes',
    message: 'Do you want to save the changes you made?',
    detail: 'Your changes will be lost if you don\'t save them.'
  });
  
  return { choice };
});

ipcMain.handle('update-field', async (event, document, fieldPath, value) => {
  try {
    currentDocument = documentManager.updateField(document, fieldPath, value);
    return { success: true, document: currentDocument };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('add-array-item', async (event, document, arrayPath, item) => {
  try {
    currentDocument = documentManager.addArrayItem(document, arrayPath, item);
    return { success: true, document: currentDocument };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('remove-array-item', async (event, document, arrayPath, index) => {
  try {
    currentDocument = documentManager.removeArrayItem(document, arrayPath, index);
    return { success: true, document: currentDocument };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('add-comment', async (event, document, comment, sectionPath) => {
  try {
    currentDocument = documentManager.addComment(document, comment, sectionPath);
    return { success: true, document: currentDocument };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Collaboration IPC Handlers

ipcMain.handle('collab-host-session', async (event, document, metadata) => {
  try {
    // Start server if not running
    if (!collaborationServer.port) {
      await collaborationServer.start(0);
    }

    // Create session
    const sessionInfo = collaborationServer.createSession(document, {
      ...metadata,
      hostName: os.hostname()
    });

    // Advertise on network
    discoveryService.advertiseSession(sessionInfo);

    currentSession = sessionInfo;

    return { 
      success: true, 
      session: sessionInfo 
    };
  } catch (err) {
    console.error('[Main] Error hosting session:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('collab-stop-hosting', async (event) => {
  try {
    discoveryService.stopAdvertising();
    currentSession = null;
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('collab-start-discovery', async (event) => {
  try {
    // Start browsing for sessions
    discoveryService.startBrowsing(
      (session) => {
        // Send to renderer when session found
        mainWindow.webContents.send('collab-session-found', session);
      },
      (session) => {
        // Send to renderer when session lost
        mainWindow.webContents.send('collab-session-lost', session);
      }
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('collab-stop-discovery', async (event) => {
  try {
    discoveryService.stopBrowsing();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('collab-get-discovered-sessions', async (event) => {
  try {
    const sessions = discoveryService.getDiscoveredSessions();
    return { success: true, sessions };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('collab-get-current-session', async (event) => {
  try {
    if (!currentSession) {
      return { success: true, session: null };
    }

    const sessionData = collaborationServer.getSession(currentSession.sessionId);
    return { success: true, session: sessionData };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Configuration IPC handlers
ipcMain.handle('config-get', async (event, key) => {
  try {
    const value = configManager.get(key);
    return { success: true, value };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-set', async (event, key, value) => {
  try {
    await configManager.set(key, value);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-get-all', async () => {
  try {
    const config = await configManager.getAll();
    return { success: true, config };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-get-preference', async (event, key, defaultValue) => {
  try {
    const value = await configManager.getPreference(key, defaultValue);
    return { success: true, value };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-set-preference', async (event, key, value) => {
  try {
    await configManager.setPreference(key, value);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-add-recent-file', async (event, filePath) => {
  try {
    await configManager.addRecentFile(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-get-recent-files', async (event) => {
  try {
    const files = configManager.getRecentFiles();
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-get-userspace-models-dir', async (event) => {
  try {
    const path = configManager.getUserspaceModelsDirectory();
    return { success: true, path };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('config-set-userspace-models-dir', async (event, dirPath) => {
  try {
    await configManager.setUserspaceModelsDirectory(dirPath);
    // Reload document types after changing directory
    await schemaLoader.loadDocumentTypes();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Template IPC handlers
ipcMain.handle('templates-load', async (event, documentType) => {
  try {
    const templates = await templateManager.loadTemplatesForType(documentType);
    return { success: true, templates };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('templates-render', async (event, templateId, documentData, documentType) => {
  try {
    const output = await templateManager.renderDocument(templateId, documentData, documentType);
    return { success: true, output };
  } catch (err) {
    console.error('[Main] Template rendering error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('templates-create', async (event, documentType, name, content) => {
  try {
    const result = await templateManager.createTemplate(documentType, name, content);
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('templates-set-active', async (event, templateId) => {
  try {
    await configManager.setActiveTemplate(templateId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('templates-get-active', async (event) => {
  try {
    const templateId = configManager.getActiveTemplate();
    return { success: true, templateId };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('import-clean-json', async (event, filePath, existingDocument) => {
  try {
    const importedDocument = await documentManager.importCleanJSON(filePath, existingDocument);
    return { success: true, document: importedDocument };
  } catch (err) {
    console.error('[Main] Error importing JSON:', err);
    return { success: false, error: err.message };
  }
});

// Menu state update handler
ipcMain.handle('update-menu-state', async (event, state) => {
  if (menuBuilder) {
    menuBuilder.updateState(state);
  }
  return { success: true };
});

// Menu action handlers (forward menu clicks to renderer)
const menuActions = [
  'menu-new-document', 'menu-open-document', 'menu-close-document',
  'menu-save-document', 'menu-save-document-as', 'menu-export-json',
  'menu-export-html', 'menu-export-word', 'menu-export-pdf',
  'menu-import-json-existing', 'menu-import-json-new',
  'menu-undo', 'menu-redo', 'menu-find', 'menu-find-next', 'menu-replace',
  'menu-toggle-sidebar', 'menu-toggle-properties',
  'menu-zoom-in', 'menu-zoom-out', 'menu-zoom-reset',
  'menu-add-section', 'menu-validate', 'menu-document-properties',
  'menu-host-session', 'menu-join-session', 'menu-stop-hosting', 'menu-session-info',
  'menu-preferences', 'menu-keyboard-shortcuts', 'menu-about',
  'menu-clear-recent'
];

// No need to handle these - they're sent directly from menu-builder

// Handle open recent file
ipcMain.on('menu-open-recent', (event, filePath) => {
  mainWindow.webContents.send('menu-open-recent', filePath);
});

// Cleanup on app quit
app.on('before-quit', () => {
  if (discoveryService) {
    discoveryService.destroy();
  }
  if (collaborationServer) {
    collaborationServer.stop();
  }
});
