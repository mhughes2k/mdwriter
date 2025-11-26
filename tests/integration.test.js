/**
 * Integration Tests for MDWriter
 * 
 * End-to-end workflows testing:
 * - Complete document lifecycle
 * - Document type discovery and use
 * - Template rendering with documents
 * - Configuration persistence
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');

// Mock filesystem
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const { SchemaLoader } = require('../src/main/schema-loader');
const DocumentManager = require('../src/main/document-manager');
const TemplateManager = require('../src/main/template-manager');
const ConfigManager = require('../src/main/config-manager');

describe('Integration Tests', () => {
  let schemaLoader;
  let documentManager;
  let templateManager;
  let configManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    schemaLoader = new SchemaLoader();
    documentManager = new DocumentManager(schemaLoader);
    configManager = new ConfigManager();
    templateManager = new TemplateManager(configManager);
  });
  
  describe('Complete Document Lifecycle', () => {
    test('should create, validate, save, and load a document', async () => {
      // Setup: Load document type
      fs.readdir.mockResolvedValueOnce([
        { name: 'mdf', isDirectory: () => true },
      ]);
      
      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        description: 'Module Descriptor',
        category: 'Academic',
        icon: '📚',
        extensions: ['mdf'],
        entrypoint: 'module-descriptor.schema.json'
      }));
      
      await schemaLoader.loadDocumentTypes();
      
      // Load schema
      const mockSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          credits: { type: 'number' }
        },
        required: ['id', 'title']
      };
      
      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));
      
      // Step 1: Create new document
      const document = await documentManager.createNew('mdf');
      
      expect(document.data.id).toBeDefined();
      expect(document.metadata.documentType).toBe('mdf');
      
      // Step 2: Fill in data
      document.data.title = 'Introduction to Computing';
      document.data.credits = 10;
      
      // Step 3: Validate
      schemaLoader.validateDocument = jest.fn().mockResolvedValue({
        valid: true
      });
      
      const validation = await documentManager.validate(document);
      expect(validation.valid).toBe(true);
      
      // Step 4: Save
      fs.writeFile.mockResolvedValue();
      
      const saveResult = await documentManager.save('/test/document.mdf', document);
      expect(saveResult.success).toBe(true);
      
      // Step 5: Load
      const savedContent = fs.writeFile.mock.calls[0][1];
      fs.readFile.mockResolvedValueOnce(savedContent);
      
      const loadedDocument = await documentManager.load('/test/document.mdf');
      
      expect(loadedDocument.data.title).toBe('Introduction to Computing');
      expect(loadedDocument.data.credits).toBe(10);
    });
  });
  
  describe('Document Type Discovery and Usage', () => {
    test('should discover multiple document types and create documents', async () => {
      // Setup multiple document types
      fs.readdir.mockResolvedValueOnce([
        { name: 'mdf', isDirectory: () => true },
        { name: 'prfaq', isDirectory: () => true },
      ]);
      
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify({
          description: 'Module Descriptor',
          category: 'Academic',
          icon: '📚',
          extensions: ['mdf'],
          entrypoint: 'mdf.schema.json'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          description: 'PR/FAQ',
          category: 'Product Management',
          icon: '📋',
          extensions: ['prfaq'],
          entrypoint: 'prfaq.schema.json'
        }));
      
      const types = await schemaLoader.loadDocumentTypes();
      
      expect(types).toHaveLength(2);
      
      // Create document of each type
      const mdfSchema = {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      };
      
      const prfaqSchema = {
        type: 'object',
        properties: { id: { type: 'string' }, question: { type: 'string' } },
        required: ['id', 'question']
      };
      
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mdfSchema))
        .mockResolvedValueOnce(JSON.stringify(prfaqSchema));
      
      const mdfDoc = await documentManager.createNew('mdf');
      const prfaqDoc = await documentManager.createNew('prfaq');
      
      expect(mdfDoc.metadata.documentType).toBe('mdf');
      expect(prfaqDoc.metadata.documentType).toBe('prfaq');
      expect(prfaqDoc.data.question).toBe('');
    });
  });
  
  describe('Template Rendering with Documents', () => {
    test('should load template and render with document data', async () => {
      // Setup config
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      fs.writeFile.mockResolvedValue();
      fs.mkdir.mockResolvedValue();
      
      await configManager.initialize();
      
      // Load template
      const mockTemplate = `---
name: Module Summary
description: Summary template
---
# {{title}}

Credits: {{credits}}
Level: {{level}}
`;
      
      fs.access.mockResolvedValueOnce();
      fs.readdir.mockResolvedValueOnce(['summary.md']);
      fs.readFile.mockResolvedValueOnce(mockTemplate);
      
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      
      const templates = await templateManager.loadTemplatesForType('mdf');
      
      expect(templates).toHaveLength(1);
      
      // Create document
      fs.readdir.mockResolvedValueOnce([
        { name: 'mdf', isDirectory: () => true },
      ]);
      
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify({
          description: 'Module Descriptor',
          category: 'Academic',
          icon: '📚',
          extensions: ['mdf'],
          entrypoint: 'mdf.schema.json'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            credits: { type: 'number' },
            level: { type: 'number' }
          },
          required: ['id']
        }));
      
      await schemaLoader.loadDocumentTypes();
      const document = await documentManager.createNew('mdf');
      
      document.data.title = 'Advanced Programming';
      document.data.credits = 20;
      document.data.level = 7;
      
      // Render template
      const rendered = await templateManager.renderTemplate(templates[0], document.data);
      
      expect(rendered).toContain('Advanced Programming');
      expect(rendered).toContain('Credits: 20');
      expect(rendered).toContain('Level: 7');
    });
  });
  
  describe('Configuration Persistence', () => {
    test('should persist configuration across sessions', async () => {
      // First session - create config
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      fs.writeFile.mockResolvedValue();
      fs.mkdir.mockResolvedValue();
      
      await configManager.initialize();
      await configManager.set('preferences.autoSave', true);
      await configManager.addRecentFile('/test/file1.mdf');
      
      const savedConfig = fs.writeFile.mock.calls[fs.writeFile.mock.calls.length - 1][1];
      
      // Second session - load config
      const configManager2 = new ConfigManager();
      
      fs.access.mockResolvedValueOnce();
      fs.readFile.mockResolvedValueOnce(savedConfig);
      fs.mkdir.mockResolvedValue();
      
      await configManager2.initialize();
      
      expect(configManager2.get('preferences.autoSave')).toBe(true);
      expect(configManager2.get('preferences.recentFiles')).toContain('/test/file1.mdf');
    });
  });
  
  describe('Schema Validation Integration', () => {
    test('should validate complex nested structures', async () => {
      const complexSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          metadata: {
            type: 'object',
            properties: {
              author: { type: 'string', format: 'email' },
              created: { type: 'string', format: 'date-time' }
            },
            required: ['author']
          },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' }
              },
              required: ['title']
            }
          }
        },
        required: ['id', 'metadata']
      };
      
      fs.readFile.mockResolvedValueOnce(JSON.stringify(complexSchema));
      
      const validDocument = {
        id: '123',
        metadata: {
          author: 'test@example.com',
          created: '2025-01-01T00:00:00Z'
        },
        sections: [
          { title: 'Introduction', content: 'Content here' }
        ]
      };
      
      const result = await schemaLoader.validateDocument('test', 'test.schema.json', validDocument);
      
      expect(result.valid).toBe(true);
    });
    
    test('should detect validation errors in nested structures', async () => {
      const complexSchema = {
        type: 'object',
        properties: {
          metadata: {
            type: 'object',
            properties: {
              author: { type: 'string', format: 'email' }
            },
            required: ['author']
          }
        },
        required: ['metadata']
      };
      
      fs.readFile.mockResolvedValueOnce(JSON.stringify(complexSchema));
      
      const invalidDocument = {
        metadata: {
          author: 'not-an-email' // Invalid email format
        }
      };
      
      const result = await schemaLoader.validateDocument('test', 'test.schema.json', invalidDocument);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
  
  describe('Document Collaboration Metadata', () => {
    test('should track comments and edit history', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'mdf', isDirectory: () => true },
      ]);
      
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify({
          description: 'Module Descriptor',
          category: 'Academic',
          icon: '📚',
          extensions: ['mdf'],
          entrypoint: 'mdf.schema.json'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          type: 'object',
          properties: { id: { type: 'string' }, title: { type: 'string' } },
          required: ['id']
        }));
      
      await schemaLoader.loadDocumentTypes();
      const document = await documentManager.createNew('mdf');
      
      // Add comment
      documentManager.addComment(document, 'Need to review this section', 'data.title');
      
      expect(document.metadata.comments).toHaveLength(1);
      expect(document.metadata.comments[0].text).toBe('Need to review this section');
      
      // Share document
      documentManager.shareWith(document, 'reviewer@example.com', 'reviewer');
      
      expect(document.metadata.sharedWith).toHaveLength(1);
      
      // Record edit
      documentManager.recordEdit(document, 'data.title', '', 'New Title', 'editor@example.com');
      
      expect(document.metadata.editHistory).toHaveLength(1);
      expect(document.metadata.editHistory[0].newValue).toBe('New Title');
    });
  });
  
  describe('Export Functionality', () => {
    test('should export clean JSON without application metadata', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'mdf', isDirectory: () => true },
      ]);
      
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify({
          description: 'Module Descriptor',
          category: 'Academic',
          icon: '📚',
          extensions: ['mdf'],
          entrypoint: 'mdf.schema.json'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          type: 'object',
          properties: { id: { type: 'string' }, title: { type: 'string' } },
          required: ['id']
        }));
      
      await schemaLoader.loadDocumentTypes();
      const document = await documentManager.createNew('mdf');
      
      document.data.title = 'Test Document';
      documentManager.addComment(document, 'Internal comment', 'data.title');
      
      fs.writeFile.mockResolvedValue();
      
      await documentManager.export('/test/export.json', document);
      
      const exportedContent = fs.writeFile.mock.calls[0][1];
      const exportedDoc = JSON.parse(exportedContent);
      
      expect(exportedDoc.metadata).toBeUndefined();
      expect(exportedDoc.title).toBe('Test Document');
      expect(exportedDoc.id).toBeDefined();
    });
  });
});
