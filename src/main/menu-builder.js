const { Menu, shell } = require('electron');

class MenuBuilder {
  constructor(mainWindow, callbacks) {
    this.mainWindow = mainWindow;
    // Use electron app name directly for menu label
    const { app } = require('electron');
    this.app = app;
    this.callbacks = callbacks || {};
    this.documentState = {
      hasDocument: false,
      isModified: false,
      canUndo: false,
      canRedo: false,
      isHosting: false,
      isInSession: false
    };
    this.recentFiles = [];
    this.hasDocument = this.documentState.hasDocument;
  }

  updateState(newState) {
    this.documentState = { ...this.documentState, ...newState };
    this.rebuild();
  }

  rebuild() {
    const menu = this.buildMenu();
    Menu.setApplicationMenu(menu);
  }

  setDocumentOpen(isOpen) {
    this.documentState.hasDocument = !!isOpen;
    this.hasDocument = this.documentState.hasDocument;
    this.rebuild();
  }

  getFileMenu() {
    const menu = this.buildMenu();
    return menu.find(item => item.label === 'File');
  }

  buildMenu() {
    const isMac = process.platform === 'darwin';
    
    const template = [
      // App Menu (macOS only)
      ...(isMac ? [{
        label: this.app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: 'Preferences...',
            accelerator: 'Cmd+,',
            click: () => this.mainWindow.webContents.send('menu-preferences')
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }] : []),
      
      // File Menu
      {
        label: 'File',
        submenu: [
          {
            label: 'New...',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              if (this.callbacks.onNew) {
                this.callbacks.onNew();
              }
              this.mainWindow.webContents.send('menu-new-document');
            }
          },
          {
            label: 'Open...',
            accelerator: 'CmdOrCtrl+O',
            click: () => {
              if (this.callbacks.onOpen) {
                this.callbacks.onOpen();
              }
              this.mainWindow.webContents.send('menu-open-document');
            }
          },
          {
            label: 'Open Recent',
            submenu: this.recentFiles.length > 0
              ? [
                  ...this.recentFiles.map((filePath, index) => ({
                    label: filePath.split(/[/\\]/).pop(),
                    accelerator: index < 9 ? `CmdOrCtrl+${index + 1}` : undefined,
                    click: () => this.mainWindow.webContents.send('menu-open-recent', filePath)
                  })),
                  { type: 'separator' },
                  {
                    label: 'Clear Recent',
                    click: () => this.mainWindow.webContents.send('menu-clear-recent')
                  }
                ]
              : [
                  {
                    label: 'No Recent Files',
                    enabled: false
                  },
                  { type: 'separator' },
                  {
                    label: 'Clear Recent',
                    enabled: false
                  }
                ]
          },
          {
            label: 'Close Document',
            accelerator: 'CmdOrCtrl+W',
            enabled: this.documentState.hasDocument,
            click: () => this.mainWindow.webContents.send('menu-close-document')
          },
          { type: 'separator' },
          {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            enabled: this.documentState.hasDocument,
            click: () => {
              if (this.callbacks.onSave) {
                this.callbacks.onSave();
              }
              this.mainWindow.webContents.send('menu-save-document');
            }
          },
          {
            label: 'Save As...',
            accelerator: 'CmdOrCtrl+Shift+S',
            enabled: this.documentState.hasDocument,
            click: () => {
              if (this.callbacks.onSaveAs) {
                this.callbacks.onSaveAs();
              }
              this.mainWindow.webContents.send('menu-save-document-as');
            }
          },
          { type: 'separator' },
          {
            label: 'Import',
            submenu: [
              {
                label: 'Import JSON into Current Document',
                enabled: this.documentState.hasDocument,
                click: () => this.mainWindow.webContents.send('menu-import-json-existing')
              },
              {
                label: 'Create from JSON Data File',
                click: () => this.mainWindow.webContents.send('menu-import-json-new')
              }
            ]
          },
          {
            label: 'Export',
            submenu: [
              {
                label: 'Export Clean JSON',
                enabled: this.documentState.hasDocument,
                click: () => {
                  if (this.callbacks.onExport) {
                    this.callbacks.onExport('json');
                  }
                  this.mainWindow.webContents.send('menu-export-json');
                }
              },
              {
                label: 'Export HTML',
                enabled: this.documentState.hasDocument,
                click: () => {
                  if (this.callbacks.onExport) {
                    this.callbacks.onExport('html');
                  }
                  this.mainWindow.webContents.send('menu-export-html');
                }
              },
              {
                label: 'Export Word (DOCX)',
                enabled: false,
                click: () => this.mainWindow.webContents.send('menu-export-word')
              },
              {
                label: 'Export PDF',
                enabled: false,
                click: () => this.mainWindow.webContents.send('menu-export-pdf')
              }
            ]
          },
          { type: 'separator' },
          ...(!isMac ? [
            {
              label: 'Preferences...',
              accelerator: 'Ctrl+,',
              click: () => this.mainWindow.webContents.send('menu-preferences')
            },
            { type: 'separator' }
          ] : []),
          ...(!isMac ? [{ role: 'quit' }] : [])
        ]
      },
      
      // Edit Menu
      {
        label: 'Edit',
        submenu: [
          {
            label: 'Undo',
            accelerator: 'CmdOrCtrl+Z',
            enabled: this.documentState.canUndo,
            click: () => this.mainWindow.webContents.send('menu-undo')
          },
          {
            label: 'Redo',
            accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
            enabled: this.documentState.canRedo,
            click: () => this.mainWindow.webContents.send('menu-redo')
          },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Find...',
            accelerator: 'CmdOrCtrl+F',
            enabled: this.documentState.hasDocument,
            click: () => this.mainWindow.webContents.send('menu-find')
          },
          {
            label: 'Find Next',
            accelerator: 'F3',
            enabled: this.documentState.hasDocument,
            click: () => this.mainWindow.webContents.send('menu-find-next')
          },
          {
            label: 'Replace...',
            accelerator: 'CmdOrCtrl+H',
            enabled: this.documentState.hasDocument,
            click: () => this.mainWindow.webContents.send('menu-replace')
          }
        ]
      },
      
      // View Menu
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Document Structure',
            accelerator: 'CmdOrCtrl+1',
            click: () => this.mainWindow.webContents.send('menu-toggle-sidebar')
          },
          {
            label: 'Toggle Properties Panel',
            accelerator: 'CmdOrCtrl+2',
            click: () => this.mainWindow.webContents.send('menu-toggle-properties')
          },
          { type: 'separator' },
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => this.mainWindow.webContents.send('menu-zoom-in')
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: () => this.mainWindow.webContents.send('menu-zoom-out')
          },
          {
            label: 'Reset Zoom',
            accelerator: 'CmdOrCtrl+0',
            click: () => this.mainWindow.webContents.send('menu-zoom-reset')
          },
          { type: 'separator' },
          { role: 'togglefullscreen' },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' }
        ]
      },
      
      // Document Menu
      {
        label: 'Document',
        submenu: [
          {
            label: 'Add Section',
            enabled: this.documentState.hasDocument,
            click: () => this.mainWindow.webContents.send('menu-add-section')
          },
          {
            label: 'Validate Document',
            accelerator: 'CmdOrCtrl+Shift+V',
            enabled: this.documentState.hasDocument,
            click: () => this.mainWindow.webContents.send('menu-validate')
          },
          { type: 'separator' },
          {
            label: 'Document Properties',
            enabled: this.documentState.hasDocument,
            click: () => this.mainWindow.webContents.send('menu-document-properties')
          }
        ]
      },
      
      // Collaborate Menu
      {
        label: 'Collaborate',
        submenu: [
          {
            label: 'Host Session...',
            enabled: this.documentState.hasDocument && !this.documentState.isHosting,
            click: () => this.mainWindow.webContents.send('menu-host-session')
          },
          {
            label: 'Join Session...',
            enabled: !this.documentState.isInSession,
            click: () => this.mainWindow.webContents.send('menu-join-session')
          },
          {
            label: 'Stop Hosting',
            enabled: this.documentState.isHosting,
            click: () => this.mainWindow.webContents.send('menu-stop-hosting')
          },
          { type: 'separator' },
          {
            label: 'Current Session Info',
            enabled: this.documentState.isInSession || this.documentState.isHosting,
            click: () => this.mainWindow.webContents.send('menu-session-info')
          }
        ]
      },
      
      // Help Menu
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
            click: () => shell.openExternal('https://github.com/mhughes2k/mdwriter')
          },
          {
            label: 'Keyboard Shortcuts',
            accelerator: isMac ? 'Cmd+/' : 'Ctrl+/',
            click: () => this.mainWindow.webContents.send('menu-keyboard-shortcuts')
          },
          { type: 'separator' },
          ...(!isMac ? [
            {
              label: 'About MDWriter',
              click: () => this.mainWindow.webContents.send('menu-about')
            }
          ] : [])
        ]
      }
    ];

    // Always build an Electron Menu from the template.
    // Tests should mock or inspect Electron's Menu API instead of relying
    // on internal test-only conditionals.
    return Menu.buildFromTemplate(template);
  }

  async updateRecentFiles(recentFiles) {
    // Store recent files and rebuild menu
    // Cannot modify existing menu items - must rebuild entire menu
    this.recentFiles = recentFiles;
    const menu = this.buildMenu();
    Menu.setApplicationMenu(menu);
  }
}

module.exports = MenuBuilder;
module.exports.MenuBuilder = MenuBuilder;
module.exports.getInstance = (mainWindow, callbacks) => new MenuBuilder(mainWindow, callbacks);
