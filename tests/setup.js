/**
 * Jest Test Setup
 * 
 * Global configuration and mocks for all tests
 */

// Suppress console output during tests unless verbose
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name) => {
      const paths = {
        userData: '/mock/userdata',
        appData: '/mock/appdata',
        home: '/mock/home',
        temp: '/mock/temp',
      };
      return paths[name] || '/mock/default';
    }),
    on: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(true),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
    },
    destroy: jest.fn(),
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeHandler: jest.fn(),
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn(),
  },
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn(),
  },
}));

// Global test utilities
global.mockFileSystem = {
  files: new Map(),
  
  reset() {
    this.files.clear();
  },
  
  addFile(path, content) {
    this.files.set(path, content);
  },
  
  hasFile(path) {
    return this.files.has(path);
  },
  
  getFile(path) {
    return this.files.get(path);
  },
};
