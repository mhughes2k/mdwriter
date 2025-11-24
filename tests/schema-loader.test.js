/*
 * Tests:
 * - Document type loading and discovery
 * - Schema loading and caching
/*
 * Tests:
 * - Document type loading and discovery
 * - Schema loading and caching
 * - Schema validation
 * - Reference resolution
 * - Format validation
 * - Error handling
 */

// Mock filesystem before any imports
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const { describe, test, expect, beforeEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');
const { SchemaLoader } = require('../src/main/schema-loader');

describe('SchemaLoader', () => {
  let schemaLoader;

  beforeEach(() => {
    jest.clearAllMocks();
    schemaLoader = new SchemaLoader();
  });

  test('should initialize Ajv instance', () => {
    expect(schemaLoader.ajv).toBeDefined();
  });

  test('should have format validators configured', () => {
    expect(schemaLoader.ajv.formats).toBeDefined();
  });

  describe('setUserspaceModelsDirectory', () => {
    test('should set userspace models path', () => {
      const testPath = '/custom/models';
      schemaLoader.setUserspaceModelsDirectory(testPath);
      expect(schemaLoader.userModelsPath).toBe(testPath);
    });

    test('should keep Ajv initialized after setting path', () => {
      schemaLoader.setUserspaceModelsDirectory('/custom/models');
      expect(schemaLoader.ajv).toBeDefined();
      expect(schemaLoader.ajv.formats).toBeDefined();
    });
  });

  describe('loadDocumentTypes', () => {
    test('should load document types from models directory', async () => {
      // Mock directory structure
      fs.readdir.mockResolvedValueOnce([
        { name: 'mdf', isDirectory: () => true },
        { name: 'prfaq', isDirectory: () => true },
      ]);

      // Mock metadata files
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify({
          description: 'Module Descriptor',
          category: 'Academic',
          icon: '📚',
          extensions: ['mdf'],
          entrypoint: 'module-descriptor.schema.json'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          description: 'PR/FAQ Document',
          category: 'Product Management',
          icon: '📋',
          extensions: ['prfaq'],
          entrypoint: 'prfaq.schema.json'
        }));

      const types = await schemaLoader.loadDocumentTypes();

      expect(types).toHaveLength(2);
      expect(types[0].name).toBe('mdf');
      expect(types[1].name).toBe('prfaq');
    });

    test('should handle missing models directory gracefully', async () => {
      fs.readdir.mockRejectedValue(new Error('ENOENT'));

      const types = await schemaLoader.loadDocumentTypes();

      expect(types).toEqual([]);
    });

    test('should load userspace models if configured', async () => {
      schemaLoader.setUserspaceModelsDirectory('/custom/models');

      // Mock bundled directory (empty)
      fs.readdir.mockResolvedValueOnce([]);

      // Mock userspace directory
      fs.readdir.mockResolvedValueOnce([
        { name: 'custom', isDirectory: () => true },
      ]);

      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        description: 'Custom Type',
        category: 'Custom',
        icon: '🔧',
        extensions: ['custom'],
        entrypoint: 'custom.schema.json'
      }));

      const types = await schemaLoader.loadDocumentTypes();

      expect(types).toHaveLength(1);
      expect(types[0].name).toBe('custom');
      expect(types[0].source).toBe('userspace');
    });
  });

  describe('getDocumentType', () => {
    beforeEach(async () => {
      // Setup a document type
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
    });

    test('should return document type by name', () => {
      const docType = schemaLoader.getDocumentType('mdf');
      expect(docType).toBeDefined();
      expect(docType.name).toBe('mdf');
      expect(docType.description).toBe('Module Descriptor');
    });

    test('should return null for unknown type', () => {
      const docType = schemaLoader.getDocumentType('unknown');
      expect(docType).toBeNull();
    });
  });

  describe('loadSchema', () => {
    test('should load and cache schema', async () => {
      const mockSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          title: { type: 'string' }
        }
      };

      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));

      const schema = await schemaLoader.loadSchema('test', 'test.schema.json');

      expect(schema).toEqual(mockSchema);
      expect(schemaLoader.schemaCache.has('test:test.schema.json')).toBe(true);
    });

    test('should return cached schema on subsequent calls', async () => {
      const mockSchema = {
        type: 'object',
        properties: { title: { type: 'string' } }
      };

      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));

      // First call - loads from file
      await schemaLoader.loadSchema('test', 'test.schema.json');

      // Second call - should use cache
      const cached = await schemaLoader.loadSchema('test', 'test.schema.json');

      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(cached).toEqual(mockSchema);
    });

    test('should handle schema loading errors', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(
        schemaLoader.loadSchema('test', 'missing.schema.json')
      ).rejects.toThrow('File not found');
    });
  });

  describe('validateDocument', () => {
    test('should validate valid document', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          version: { type: 'number' }
        },
        required: ['title']
      };

      const document = {
        title: 'Test Document',
        version: 1.0
      };

      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));

      const result = await schemaLoader.validateDocument('test', 'test.schema.json', document);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should detect missing required fields', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          title: { type: 'string' }
        },
        required: ['title']
      };

      const document = {}; // Missing required field

      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));

      const result = await schemaLoader.validateDocument('test', 'test.schema.json', document);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect type mismatches', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          version: { type: 'number' }
        }
      };

      const document = {
        version: 'not a number' // Wrong type
      };

      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));

      const result = await schemaLoader.validateDocument('test', 'test.schema.json', document);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should allow empty strings for non-required format fields', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          url: { type: 'string', format: 'uri' }
        }
      };

      const document = {
        email: '',
        url: ''
      };

      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));

      const result = await schemaLoader.validateDocument('test', 'test.schema.json', document);

      expect(result.valid).toBe(true);
    });

    test('should validate email format', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' }
        },
        required: ['email']
      };

      const invalidDoc = { email: 'not-an-email' };
      const validDoc = { email: 'test@example.com' };

      fs.readFile.mockResolvedValue(JSON.stringify(mockSchema));

      const invalidResult = await schemaLoader.validateDocument('test', 'test.schema.json', invalidDoc);
      expect(invalidResult.valid).toBe(false);

      const validResult = await schemaLoader.validateDocument('test', 'test.schema.json', validDoc);
      expect(validResult.valid).toBe(true);
    });
  });

  describe('getFieldOrder', () => {
    test('should return custom field order from metadata', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'test', isDirectory: () => true },
      ]);

      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        description: 'Test Type',
        category: 'Test',
        icon: '🧪',
        extensions: ['test'],
        entrypoint: 'test.schema.json',
        fieldOrder: ['field2', 'field1', 'field3']
      }));

      await schemaLoader.loadDocumentTypes();

      const order = schemaLoader.getFieldOrder('test');
      expect(order).toEqual(['field2', 'field1', 'field3']);
    });

    test('should return null if no custom order defined', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'test', isDirectory: () => true },
      ]);

      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        description: 'Test Type',
        category: 'Test',
        icon: '🧪',
        extensions: ['test'],
        entrypoint: 'test.schema.json'
      }));

      await schemaLoader.loadDocumentTypes();

      const order = schemaLoader.getFieldOrder('test');
      expect(order).toBeNull();
    });
  });

  describe('getUIHints', () => {
    test('should return UI hints from metadata', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'test', isDirectory: () => true },
      ]);

      fs.readFile.mockResolvedValueOnce(JSON.stringify({
        description: 'Test Type',
        category: 'Test',
        icon: '🧪',
        extensions: ['test'],
        entrypoint: 'test.schema.json',
        uiHints: {
          description: {
            displayType: 'textarea',
            displayAs: 'Full Description'
          }
        }
      }));

      await schemaLoader.loadDocumentTypes();

      const hints = schemaLoader.getUIHints('test');
      expect(hints.description.displayType).toBe('textarea');
      expect(hints.description.displayAs).toBe('Full Description');
    });
  });
});
