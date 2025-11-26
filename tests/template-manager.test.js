/*
 * Unit Tests for TemplateManager
 * 
 * Tests:
 * - Template loading (bundled and user)
 * - Template parsing and metadata extraction
 * - Placeholder extraction
 * - Template rendering
 * - Template validation
 */





//
// Mock filesystem before any imports
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const { describe, test, expect, beforeEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');
const { TemplateManager } = require('../src/main/template-manager');

describe('TemplateManager', () => {
  let templateManager;
  let mockConfigManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfigManager = {
      getUserspaceTemplatesDirectory: jest.fn().mockReturnValue('/user/templates'),
    };
    
    templateManager = new TemplateManager(mockConfigManager);
  });
  
  describe('Constructor', () => {
    test('should initialize with empty template map', () => {
      expect(templateManager.templates).toBeInstanceOf(Map);
      expect(templateManager.templates.size).toBe(0);
    });
    
    test('should store config manager reference', () => {
      expect(templateManager.configManager).toBe(mockConfigManager);
    });
  });
  
  describe('loadTemplatesForType', () => {
    test('should load bundled templates', async () => {
      const mockTemplate = `---
name: Default Template
description: A basic template
---
# {{title}}

Version: {{version}}
`;
      
      fs.access.mockResolvedValueOnce();
      fs.readdir.mockResolvedValueOnce(['default.md']);
      fs.readFile.mockResolvedValueOnce(mockTemplate);
      
      // Mock empty user templates
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      
      const templates = await templateManager.loadTemplatesForType('mdf');
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Default Template');
      expect(templates[0].source).toBe('bundled');
      expect(templates[0].documentType).toBe('mdf');
    });
    
    test('should load user templates', async () => {
      const mockUserTemplate = `---
name: Custom Template
description: User created template
---
# Custom: {{title}}
`;
      
      // Mock no bundled templates
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      
      // Mock user templates
      fs.access.mockResolvedValueOnce();
      fs.readdir.mockResolvedValueOnce(['custom.md']);
      fs.readFile.mockResolvedValueOnce(mockUserTemplate);
      
      const templates = await templateManager.loadTemplatesForType('mdf');
      
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Custom Template');
      expect(templates[0].source).toBe('user');
    });
    
    test('should load both bundled and user templates', async () => {
      const bundledTemplate = `---
name: Bundled
---
Content
`;
      
      const userTemplate = `---
name: User
---
Content
`;
      
      // Bundled templates
      fs.access.mockResolvedValueOnce();
      fs.readdir.mockResolvedValueOnce(['bundled.md']);
      fs.readFile.mockResolvedValueOnce(bundledTemplate);
      
      // User templates
      fs.access.mockResolvedValueOnce();
      fs.readdir.mockResolvedValueOnce(['user.md']);
      fs.readFile.mockResolvedValueOnce(userTemplate);
      
      const templates = await templateManager.loadTemplatesForType('mdf');
      
      expect(templates).toHaveLength(2);
      expect(templates[0].source).toBe('bundled');
      expect(templates[1].source).toBe('user');
    });
    
    test('should handle missing template directories', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));
      
      const templates = await templateManager.loadTemplatesForType('mdf');
      
      expect(templates).toEqual([]);
    });
    
    test('should cache loaded templates', async () => {
      const mockTemplate = `---
name: Test
---
Content
`;
      
      fs.access.mockResolvedValueOnce();
      fs.readdir.mockResolvedValueOnce(['test.md']);
      fs.readFile.mockResolvedValueOnce(mockTemplate);
      
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      
      await templateManager.loadTemplatesForType('mdf');
      
      expect(templateManager.templates.size).toBe(1);
      const templateId = 'bundled:mdf:test';
      expect(templateManager.templates.has(templateId)).toBe(true);
    });
  });
  
  describe('parseTemplateMetadata', () => {
    test('should parse YAML frontmatter', () => {
      const template = `---
name: Test Template
description: A test
author: John Doe
---
# Content`;
      
      const metadata = templateManager.parseTemplateMetadata(template);
      
      expect(metadata.name).toBe('Test Template');
      expect(metadata.description).toBe('A test');
      expect(metadata.author).toBe('John Doe');
    });
    
    test('should handle templates without frontmatter', () => {
      const template = '# Just content\n\nNo metadata';
      
      const metadata = templateManager.parseTemplateMetadata(template);
      
      expect(metadata).toEqual({});
    });
    
    test('should handle malformed frontmatter', () => {
      const template = `---
invalid: yaml: syntax::
---
Content`;
      
      const metadata = templateManager.parseTemplateMetadata(template);
      
      expect(metadata).toEqual({});
    });
  });
  
  describe('extractPlaceholders', () => {
    test('should extract placeholders from template', () => {
      const template = '# {{title}}\n\nVersion: {{version}}\nAuthor: {{author}}';
      
      const placeholders = templateManager.extractPlaceholders(template);
      
      expect(placeholders).toContain('title');
      expect(placeholders).toContain('version');
      expect(placeholders).toContain('author');
      expect(placeholders).toHaveLength(3);
    });
    
    test('should handle nested placeholders', () => {
      const template = '{{person.name}} - {{person.email}}';
      
      const placeholders = templateManager.extractPlaceholders(template);
      
      expect(placeholders).toContain('person.name');
      expect(placeholders).toContain('person.email');
    });
    
    test('should deduplicate placeholders', () => {
      const template = '{{title}} and {{title}} again';
      
      const placeholders = templateManager.extractPlaceholders(template);
      
      expect(placeholders).toEqual(['title']);
    });
    
    test('should handle templates with no placeholders', () => {
      const template = 'Static content only';
      
      const placeholders = templateManager.extractPlaceholders(template);
      
      expect(placeholders).toEqual([]);
    });
  });
  
  describe('renderTemplate', () => {
    test('should replace placeholders with values', async () => {
      const template = {
        content: '# {{title}}\n\nVersion: {{version}}'
      };
      
      const data = {
        title: 'Test Document',
        version: '1.0'
      };
      
      const rendered = await templateManager.renderTemplate(template, data);
      
      expect(rendered).toBe('# Test Document\n\nVersion: 1.0');
    });
    
    test('should handle nested data', async () => {
      const template = {
        content: 'Name: {{author.name}}\nEmail: {{author.email}}'
      };
      
      const data = {
        author: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };
      
      const rendered = await templateManager.renderTemplate(template, data);
      
      expect(rendered).toContain('Name: John Doe');
      expect(rendered).toContain('Email: john@example.com');
    });
    
    test('should handle missing data gracefully', async () => {
      const template = {
        content: '{{title}} - {{missing}}'
      };
      
      const data = {
        title: 'Test'
      };
      
      const rendered = await templateManager.renderTemplate(template, data);
      
      expect(rendered).toContain('Test');
      expect(rendered).toContain('{{missing}}'); // Unchanged
    });
    
    test('should handle arrays', async () => {
      const template = {
        content: '{{#each items}}{{name}}\n{{/each}}'
      };
      
      const data = {
        items: [
          { name: 'Item 1' },
          { name: 'Item 2' }
        ]
      };
      
      const rendered = await templateManager.renderTemplate(template, data);
      
      expect(rendered).toContain('Item 1');
      expect(rendered).toContain('Item 2');
    });
  });
  
  describe('getTemplate', () => {
    test('should retrieve cached template by id', async () => {
      const mockTemplate = `---
name: Test
---
Content`;
      
      fs.access.mockResolvedValueOnce();
      fs.readdir.mockResolvedValueOnce(['test.md']);
      fs.readFile.mockResolvedValueOnce(mockTemplate);
      
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      
      await templateManager.loadTemplatesForType('mdf');
      
      const template = templateManager.getTemplate('bundled:mdf:test');
      
      expect(template).toBeDefined();
      expect(template.name).toBe('Test');
    });
    
    test('should return undefined for unknown template', () => {
      const template = templateManager.getTemplate('unknown:id');
      
      expect(template).toBeUndefined();
    });
  });
  
  describe('saveUserTemplate', () => {
    test('should save template to user directory', async () => {
      const template = {
        name: 'My Template',
        description: 'Custom template',
        content: '# {{title}}'
      };
      
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      const result = await templateManager.saveUserTemplate('mdf', 'my-template', template);
      
      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
      
      const savedContent = fs.writeFile.mock.calls[0][1];
      expect(savedContent).toContain('name: My Template');
      expect(savedContent).toContain('# {{title}}');
    });
    
    test('should create directory if it does not exist', async () => {
      const template = {
        name: 'Test',
        content: 'Content'
      };
      
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      await templateManager.saveUserTemplate('mdf', 'test', template);
      
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(path.join('templates', 'mdf')),
        { recursive: true }
      );
    });
    
    test('should handle save errors', async () => {
      const template = {
        name: 'Test',
        content: 'Content'
      };
      
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      const result = await templateManager.saveUserTemplate('mdf', 'test', template);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });
  
  describe('deleteUserTemplate', () => {
    test('should delete user template', async () => {
      const fs = require('fs').promises;
      fs.unlink = jest.fn().mockResolvedValue();
      
      const result = await templateManager.deleteUserTemplate('user:mdf:test');
      
      expect(result.success).toBe(true);
    });
    
    test('should not delete bundled templates', async () => {
      const result = await templateManager.deleteUserTemplate('bundled:mdf:test');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete bundled');
    });
  });
});
