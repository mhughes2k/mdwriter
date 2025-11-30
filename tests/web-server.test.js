/**
 * Web Server Tests
 * 
 * Tests for the Express web server API endpoints
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const http = require('http');

// Mock fs module before requiring server
const mockFs = {
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  }
};

jest.mock('fs', () => mockFs);

// Import after mocking
const SchemaService = require('../src/web-server/services/schema-service');
const StorageService = require('../src/web-server/services/storage-service');

describe('SchemaService', () => {
  let schemaService;

  beforeEach(() => {
    jest.clearAllMocks();
    schemaService = new SchemaService();
    schemaService.modelsPath = '/test/models';
  });

  describe('Constructor', () => {
    test('should initialize with Ajv instance', () => {
      expect(schemaService.ajv).toBeDefined();
    });

    test('should initialize empty caches', () => {
      expect(schemaService.schemaCache.size).toBe(0);
      expect(schemaService.validatorCache.size).toBe(0);
      expect(schemaService.documentTypes.size).toBe(0);
    });
  });

  describe('loadDocumentTypes', () => {
    test('should load document types from directory', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        { name: 'mdf', isDirectory: () => true },
        { name: 'prfaq', isDirectory: () => true }
      ]);

      const mdfMetadata = {
        description: 'Module Descriptor',
        category: 'Academic',
        icon: '📘',
        extensions: ['mdf'],
        entrypoint: 'module-descriptor.schema.json'
      };

      const prfaqMetadata = {
        description: 'PR/FAQ',
        category: 'Product',
        icon: '📄',
        extensions: ['prfaq'],
        entrypoint: 'prfaq.schema.json'
      };

      mockFs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(mdfMetadata))
        .mockResolvedValueOnce(JSON.stringify(prfaqMetadata));

      mockFs.promises.access
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      await schemaService.loadDocumentTypes();

      expect(schemaService.documentTypes.size).toBe(2);
      expect(schemaService.getDocumentType('mdf')).toBeDefined();
      expect(schemaService.getDocumentType('prfaq')).toBeDefined();
    });

    test('should skip types with missing entrypoint', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        { name: 'broken', isDirectory: () => true }
      ]);

      mockFs.promises.readFile.mockResolvedValueOnce(JSON.stringify({
        description: 'Broken Type',
        entrypoint: 'missing.schema.json'
      }));

      mockFs.promises.access.mockRejectedValueOnce(new Error('ENOENT'));

      await schemaService.loadDocumentTypes();

      expect(schemaService.documentTypes.size).toBe(0);
    });

    test('should handle empty models directory', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([]);

      const result = await schemaService.loadDocumentTypes();

      expect(result).toEqual([]);
      expect(schemaService.documentTypes.size).toBe(0);
    });
  });

  describe('getDocumentTypes', () => {
    test('should return all document types as array', () => {
      schemaService.documentTypes.set('mdf', { name: 'mdf' });
      schemaService.documentTypes.set('prfaq', { name: 'prfaq' });

      const types = schemaService.getDocumentTypes();

      expect(types).toHaveLength(2);
      expect(types[0].name).toBe('mdf');
    });
  });

  describe('getDocumentType', () => {
    test('should return document type by name', () => {
      schemaService.documentTypes.set('mdf', { name: 'mdf', description: 'Test' });

      const docType = schemaService.getDocumentType('mdf');

      expect(docType.description).toBe('Test');
    });

    test('should return null for unknown type', () => {
      expect(schemaService.getDocumentType('unknown')).toBeNull();
    });
  });

  describe('parseSchemaProperties', () => {
    test('should parse schema properties', () => {
      const schema = {
        properties: {
          title: { type: 'string', title: 'Title' },
          description: { type: 'string', title: 'Description' }
        },
        required: ['title']
      };

      const result = schemaService.parseSchemaProperties(schema);

      expect(result).toHaveLength(2);
      expect(result.find(p => p.name === 'title').required).toBe(true);
      expect(result.find(p => p.name === 'description').required).toBe(false);
    });

    test('should apply field ordering', () => {
      const schema = {
        properties: {
          c: { type: 'string' },
          a: { type: 'string' },
          b: { type: 'string' }
        }
      };

      const result = schemaService.parseSchemaProperties(schema, {}, {}, ['b', 'a']);

      expect(result[0].name).toBe('b');
      expect(result[1].name).toBe('a');
      expect(result[2].name).toBe('c');
    });

    test('should apply UI hints', () => {
      const schema = {
        properties: {
          description: { type: 'string' }
        }
      };

      const uiHints = {
        description: { displayAs: 'Module Description', displayType: 'textarea' }
      };

      const result = schemaService.parseSchemaProperties(schema, uiHints);

      expect(result[0].displayAs).toBe('Module Description');
      expect(result[0].displayType).toBe('textarea');
    });
  });

  describe('createEmptyDocument', () => {
    test('should create document with required fields', async () => {
      schemaService.documentTypes.set('test', {
        name: 'test',
        path: '/test/models/test/json-schema',
        entrypoint: 'test.schema.json'
      });

      const schema = {
        required: ['id', 'title'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' }
        }
      };

      mockFs.promises.readFile.mockResolvedValueOnce(JSON.stringify(schema));

      const doc = await schemaService.createEmptyDocument('test');

      expect(doc.metadata.documentType).toBe('test');
      expect(doc.data.id).toBeDefined(); // UUID
      expect(doc.data.title).toBe('');
    });
  });

  describe('_generateUUID', () => {
    test('should generate valid UUID format', () => {
      const uuid = schemaService._generateUUID();

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(schemaService._generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });
});

describe('StorageService', () => {
  let storageService;

  beforeEach(() => {
    jest.clearAllMocks();
    storageService = new StorageService({ storageDir: '/test/storage' });
  });

  describe('Constructor', () => {
    test('should set storage directories', () => {
      expect(storageService.storageDir).toBe('/test/storage');
      expect(storageService.documentsDir).toBe('/test/storage/documents');
      expect(storageService.templatesDir).toBe('/test/storage/templates');
    });
  });

  describe('generateId', () => {
    test('should generate valid UUID', () => {
      const id = storageService.generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('parseDocument', () => {
    test('should parse application format document', () => {
      const content = JSON.stringify({
        metadata: { documentType: 'mdf' },
        data: { title: 'Test' }
      });

      const result = storageService.parseDocument(content);

      expect(result.success).toBe(true);
      expect(result.document.data.title).toBe('Test');
    });

    test('should parse raw JSON data', () => {
      const content = JSON.stringify({ title: 'Test' });

      const result = storageService.parseDocument(content);

      expect(result.success).toBe(true);
      expect(result.rawData.title).toBe('Test');
      expect(result.document).toBeNull();
    });

    test('should return error for invalid JSON', () => {
      const result = storageService.parseDocument('invalid json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('saveDocument', () => {
    test('should save document to file', async () => {
      mockFs.promises.writeFile.mockResolvedValueOnce();

      const document = {
        metadata: { documentType: 'mdf', editHistory: [] },
        data: { title: 'Test' }
      };

      const result = await storageService.saveDocument('doc123', document);

      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc123');
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
    });
  });

  describe('loadDocument', () => {
    test('should load existing document', async () => {
      const document = {
        metadata: { documentType: 'mdf' },
        data: { title: 'Test' }
      };

      mockFs.promises.readFile.mockResolvedValueOnce(JSON.stringify(document));

      const result = await storageService.loadDocument('doc123');

      expect(result.success).toBe(true);
      expect(result.document.data.title).toBe('Test');
    });

    test('should return error for missing document', async () => {
      const error = new Error('ENOENT');
      error.code = 'ENOENT';
      mockFs.promises.readFile.mockRejectedValueOnce(error);

      const result = await storageService.loadDocument('missing');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document not found');
    });
  });
});
