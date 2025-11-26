/**
 * Unit Tests for Menu Builder
 * 
 * Tests:
 * - Menu structure creation
 * - Platform-specific menus
 * - Menu item enabling/disabling
 * - Recent files menu
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock electron Menu
const mockMenu = {
  buildFromTemplate: jest.fn((template) => template),
  setApplicationMenu: jest.fn(),
};

jest.mock('electron', () => ({
  Menu: mockMenu,
  app: {
    name: 'MDWriter',
    quit: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
  },
}));

const MenuBuilder = require('../src/main/menu-builder');

describe('MenuBuilder', () => {
  let menuBuilder;
  let mockMainWindow;
  let mockCallbacks;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockMainWindow = {
      webContents: {
        send: jest.fn(),
      },
    };
    
    mockCallbacks = {
      onNew: jest.fn(),
      onOpen: jest.fn(),
      onSave: jest.fn(),
      onSaveAs: jest.fn(),
      onExport: jest.fn(),
      onOpenRecent: jest.fn(),
    };
    
    menuBuilder = new MenuBuilder(mockMainWindow, mockCallbacks);
  });
  
  describe('Constructor', () => {
    test('should store main window reference', () => {
      expect(menuBuilder.mainWindow).toBe(mockMainWindow);
    });
    
    test('should store callbacks', () => {
      expect(menuBuilder.callbacks).toBe(mockCallbacks);
    });
    
    test('should initialize recent files as empty', () => {
      expect(menuBuilder.recentFiles).toEqual([]);
    });
  });
  
  describe('buildMenu', () => {
    test('should build menu template', () => {
      menuBuilder.buildMenu();
      expect(mockMenu.buildFromTemplate).toHaveBeenCalled();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];

      expect(Array.isArray(menu)).toBe(true);
      expect(menu.length).toBeGreaterThan(0);
    });
    
    test('should include File menu', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');

      expect(fileMenu).toBeDefined();
      expect(fileMenu.submenu).toBeDefined();
    });
    
    test('should include Edit menu', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const editMenu = menu.find(item => item.label === 'Edit');

      expect(editMenu).toBeDefined();
    });
    
    test('should include View menu', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const viewMenu = menu.find(item => item.label === 'View');

      expect(viewMenu).toBeDefined();
    });
    
    test('should include Help menu', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const helpMenu = menu.find(item => item.label === 'Help');

      expect(helpMenu).toBeDefined();
    });
  });
  
  describe('getFileMenu', () => {
    test('should include New menu item', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');
      const newItem = fileMenu.submenu.find(item => item.label === 'New...');

      expect(newItem).toBeDefined();
      expect(newItem.accelerator).toBeDefined();
    });
    
    test('should include Open menu item', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');
      const openItem = fileMenu.submenu.find(item => item.label === 'Open...');

      expect(openItem).toBeDefined();
      expect(typeof openItem.click).toBe('function');
    });
    
    test('should include Save menu item', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');
      const saveItem = fileMenu.submenu.find(item => item.label === 'Save');

      expect(saveItem).toBeDefined();
      expect(saveItem.accelerator).toContain('S');
    });
    
    test('should include Export menu item', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');
      const exportItem = fileMenu.submenu.find(item => item.label && item.label.includes('Export'));

      expect(exportItem).toBeDefined();
    });
    
    test('should include Recent Files submenu', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');
      const recentItem = fileMenu.submenu.find(item => item.label === 'Open Recent');

      expect(recentItem).toBeDefined();
      expect(recentItem.submenu).toBeDefined();
    });
  });
  
  describe('updateRecentFiles', () => {
    test('should update recent files menu', () => {
      const recentFiles = ['/path/to/file1.mdf', '/path/to/file2.mdf'];
      
      menuBuilder.updateRecentFiles(recentFiles);
      
      expect(menuBuilder.recentFiles).toEqual(recentFiles);
    });
    
    test('should rebuild menu when recent files change', () => {
      const spy = jest.spyOn(menuBuilder, 'buildMenu');
      
      menuBuilder.updateRecentFiles(['/test.mdf']);
      
      expect(spy).toHaveBeenCalled();
    });
  });
  
  describe('setDocumentOpen', () => {
    test('should enable save menu when document is open', () => {
      menuBuilder.setDocumentOpen(true);
      
      expect(menuBuilder.hasDocument).toBe(true);
    });
    
    test('should disable save menu when no document', () => {
      menuBuilder.setDocumentOpen(false);
      
      expect(menuBuilder.hasDocument).toBe(false);
    });
    
    test('should rebuild menu when document state changes', () => {
      const spy = jest.spyOn(menuBuilder, 'buildMenu');
      
      menuBuilder.setDocumentOpen(true);
      
      expect(spy).toHaveBeenCalled();
    });
  });
  
  describe('Menu Item Callbacks', () => {
    test('should call onNew callback', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');
      const newItem = fileMenu.submenu.find(item => item.label === 'New...');

      newItem.click();

      expect(mockCallbacks.onNew).toHaveBeenCalled();
    });
    
    test('should call onOpen callback', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');
      const openItem = fileMenu.submenu.find(item => item.label === 'Open...');

      openItem.click();

      expect(mockCallbacks.onOpen).toHaveBeenCalled();
    });
    
    test('should call onSave callback', () => {
      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];
      const fileMenu = menu.find(item => item.label === 'File');
      const saveItem = fileMenu.submenu.find(item => item.label === 'Save');

      saveItem.click();

      expect(mockCallbacks.onSave).toHaveBeenCalled();
    });
  });
  
  describe('Platform-specific menus', () => {
    test('should include macOS app menu on darwin', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      menuBuilder.buildMenu();
      const menu = mockMenu.buildFromTemplate.mock.calls[0][0];

      // On macOS, first menu should be app menu
      expect(menu[0].label).toBe('MDWriter');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
