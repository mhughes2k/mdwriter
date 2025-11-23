const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const schemaLoader = require('./schema-loader');
const DocumentManager = require('./document-manager');

let mainWindow;
let documentManager;
let currentDocument = null;

async function initialize() {
  // Load all document types from models directory
  await schemaLoader.loadDocumentTypes();
  documentManager = new DocumentManager(schemaLoader);
  console.log('Application initialized');
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
        console.error('[Main] Error checking unsaved changes:', err);
        mainWindow.destroy();
      });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
    console.log('[Main] Getting schema structure for:', documentType);
    const result = await schemaLoader.getSchemaStructure(documentType);
    console.log('[Main] Schema structure loaded, properties:', result?.length || 0);
    return result;
  } catch (err) {
    console.error('[Main] Error getting schema structure:', err);
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
        console.warn('Custom form implementation not found:', implPath);
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
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-document-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Module Descriptors', extensions: ['mdf', 'module'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
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
    
    return { 
      success: true, 
      document: currentDocument,
      validation 
    };
  } catch (err) {
    console.error('[Main] Error loading document:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-document-dialog', async (event, isExport, defaultPath) => {
  const filters = isExport 
    ? [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    : [
        { name: 'Module Descriptors', extensions: ['mdf', 'module'] },
        { name: 'All Files', extensions: ['*'] }
      ];

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
    return { valid: false, errors: [{ message: err.message }] };
  }
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
