/*
 * Unit Tests for DocumentManager
 * 
 * Tests:
 * - Document creation
 * - Document loading (file format and raw format)
 * - Document saving
 * - Document validation
 * - Metadata management
 * - Error handling
 */





//
// Mock filesystem before any imports
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
  },
}));

const { describe, test, expect, beforeEach } = require('@jest/globals');
const fs = require('fs').promises;
const DocumentManager = require('../src/main/document-manager');

describe('DocumentManager', () => {
  let documentManager;
  let mockSchemaLoader;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock SchemaLoader
    mockSchemaLoader = {
      getDocumentType: jest.fn(),
      loadSchema: jest.fn(),
      validateDocument: jest.fn(),
      documentTypes: new Map(),
    };
    
    documentManager = new DocumentManager(mockSchemaLoader);
  });
  
  describe('createNew', () => {
    test('should create new document with required fields', async () => {
      const mockDocType = {
        name: 'mdf',
        description: 'Module Descriptor',
        entrypoint: 'module-descriptor.schema.json'
      };
      
      const mockSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          version: { type: 'string' }
        },
        required: ['id', 'title']
      };
      
      mockSchemaLoader.getDocumentType.mockReturnValue(mockDocType);
      mockSchemaLoader.loadSchema.mockResolvedValue(mockSchema);
      
      const document = await documentManager.createNew('mdf');
      
      expect(document).toBeDefined();
      expect(document.metadata).toBeDefined();
      expect(document.data).toBeDefined();
      expect(document.data.id).toBeDefined();
      expect(document.data.title).toBe('');
    });
    
    test('should set metadata fields correctly', async () => {
      const mockDocType = {
        name: 'mdf',
        entrypoint: 'test.schema.json'
      };
      
      const mockSchema = {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      };
      
      mockSchemaLoader.getDocumentType.mockReturnValue(mockDocType);
      mockSchemaLoader.loadSchema.mockResolvedValue(mockSchema);
      
      const document = await documentManager.createNew('mdf');
      
      expect(document.metadata.version).toBe('1.0');
      expect(document.metadata.documentType).toBe('mdf');
      expect(document.metadata.created).toBeDefined();
      expect(document.metadata.modified).toBeDefined();
      expect(document.metadata.comments).toEqual([]);
      expect(document.metadata.sharedWith).toEqual([]);
      expect(document.metadata.editHistory).toEqual([]);
    });
    
    test('should generate UUID for id field', async () => {
      const mockDocType = {
        name: 'test',
        entrypoint: 'test.schema.json'
      };
      
      const mockSchema = {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      };
      
      mockSchemaLoader.getDocumentType.mockReturnValue(mockDocType);
      mockSchemaLoader.loadSchema.mockResolvedValue(mockSchema);
      
      const document = await documentManager.createNew('test');
      
      expect(document.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
    
    test('should throw error for unknown document type', async () => {
      mockSchemaLoader.getDocumentType.mockReturnValue(null);
      
      await expect(documentManager.createNew('unknown')).rejects.toThrow('Unknown document type: unknown');
    });
  });
  
  describe('load', () => {
    test('should load document in application format', async () => {
      const mockDocument = {
        metadata: {
          version: '1.0',
          documentType: 'mdf',
          created: '2025-01-01T00:00:00Z',
          modified: '2025-01-01T00:00:00Z'
        },
        data: {
          id: '123',
          title: 'Test Document'
        }
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(mockDocument));
      
      const document = await documentManager.load('/path/to/document.mdf');
      
      expect(document.filePath).toBe('/path/to/document.mdf');
      expect(document.metadata.documentType).toBe('mdf');
      expect(document.data.title).toBe('Test Document');
    });
    
    test('should load raw JSON document and wrap in application format', async () => {
      const mockRawDocument = {
        id: '123',
        title: 'Raw Document'
      };
      
      const mockDocType = {
        name: 'mdf',
        extensions: ['mdf']
      };
      
      mockSchemaLoader.documentTypes.set('mdf', mockDocType);
      fs.readFile.mockResolvedValue(JSON.stringify(mockRawDocument));
      
      const document = await documentManager.load('/path/to/document.mdf');
      
      expect(document.metadata).toBeDefined();
      expect(document.metadata.documentType).toBe('mdf');
      expect(document.data).toEqual(mockRawDocument);
    });
    
    test('should handle file read errors', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(documentManager.load('/missing/file.mdf')).rejects.toThrow('File not found');
    });
    
    test('should handle invalid JSON', async () => {
      fs.readFile.mockResolvedValue('invalid json {{{');
      
      await expect(documentManager.load('/path/to/invalid.mdf')).rejects.toThrow();
    });
    
    test('should handle unknown file extension', async () => {
      const mockRawDocument = { title: 'Test' };
      fs.readFile.mockResolvedValue(JSON.stringify(mockRawDocument));
      mockSchemaLoader.documentTypes.clear();
      
      await expect(documentManager.load('/path/to/unknown.xyz')).rejects.toThrow('Could not determine document type');
    });
  });
  
  describe('save', () => {
    test('should save document in application format', async () => {
      const document = {
        metadata: {
          version: '1.0',
          documentType: 'mdf',
          created: '2025-01-01T00:00:00Z',
          modified: '2025-01-01T00:00:00Z'
        },
        data: {
          id: '123',
          title: 'Test Document'
        }
      };
      
      fs.writeFile.mockResolvedValue();
      
      const result = await documentManager.save('/path/to/document.mdf', document);
      
      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/path/to/document.mdf',
        expect.any(String),
        'utf8'
      );
    });
    
    test('should update modified timestamp on save', async () => {
      const document = {
        metadata: {
          version: '1.0',
          documentType: 'mdf',
          created: '2025-01-01T00:00:00Z',
          modified: '2025-01-01T00:00:00Z'
        },
        data: { id: '123' }
      };
      
      fs.writeFile.mockResolvedValue();
      
      const beforeSave = new Date();
      await documentManager.save('/path/to/document.mdf', document);
      const afterSave = new Date();
      
      const savedContent = fs.writeFile.mock.calls[0][1];
      const savedDoc = JSON.parse(savedContent);
      const modifiedTime = new Date(savedDoc.metadata.modified);
      
      expect(modifiedTime >= beforeSave).toBe(true);
      expect(modifiedTime <= afterSave).toBe(true);
    });
    
    test('should handle save errors', async () => {
      const document = {
        metadata: { version: '1.0', documentType: 'test' },
        data: { id: '123' }
      };
      
      fs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      const result = await documentManager.save('/readonly/document.mdf', document);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });
  
  describe('export', () => {
    test('should export clean JSON without metadata', async () => {
      const document = {
        metadata: {
          version: '1.0',
          documentType: 'mdf',
          comments: ['Test comment']
        },
        data: {
          id: '123',
          title: 'Test Document',
          version: '1.0'
        }
      };
      
      fs.writeFile.mockResolvedValue();
      
      const result = await documentManager.export('/path/to/export.json', document);
      
      expect(result.success).toBe(true);
      
      const savedContent = fs.writeFile.mock.calls[0][1];
      const exportedDoc = JSON.parse(savedContent);
      
      expect(exportedDoc.metadata).toBeUndefined();
      expect(exportedDoc).toEqual(document.data);
    });
  });
  
  describe('validate', () => {
    test('should validate document against schema', async () => {
      const document = {
        metadata: { documentType: 'mdf' },
        data: {
          id: '123',
          title: 'Test Document'
        }
      };
      
      const mockDocType = {
        entrypoint: 'test.schema.json'
      };
      
      mockSchemaLoader.getDocumentType.mockReturnValue(mockDocType);
      mockSchemaLoader.validateDocument.mockResolvedValue({
        valid: true
      });
      
      const result = await documentManager.validate(document);
      
      expect(result.valid).toBe(true);
      expect(mockSchemaLoader.validateDocument).toHaveBeenCalledWith(
        'mdf',
        'test.schema.json',
        document.data
      );
    });
    
    test('should return validation errors', async () => {
      const document = {
        metadata: { documentType: 'mdf' },
        data: { title: 'Missing ID' }
      };
      
      const mockDocType = {
        entrypoint: 'test.schema.json'
      };
      
      const mockErrors = [
        { field: 'id', message: 'Required field missing' }
      ];
      
      mockSchemaLoader.getDocumentType.mockReturnValue(mockDocType);
      mockSchemaLoader.validateDocument.mockResolvedValue({
        valid: false,
        errors: mockErrors
      });
      
      const result = await documentManager.validate(document);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(mockErrors);
    });
    
    test('should handle unknown document type', async () => {
      const document = {
        metadata: { documentType: 'unknown' },
        data: {}
      };
      
      mockSchemaLoader.getDocumentType.mockReturnValue(null);
      
      await expect(documentManager.validate(document)).rejects.toThrow('Unknown document type');
    });
  });
  
  describe('addComment', () => {
    test('should add comment to document', () => {
      const document = {
        metadata: {
          comments: []
        },
        data: {}
      };
      
      documentManager.addComment(document, 'Test comment', 'field.path');
      
      expect(document.metadata.comments).toHaveLength(1);
      expect(document.metadata.comments[0].text).toBe('Test comment');
      expect(document.metadata.comments[0].fieldPath).toBe('field.path');
      expect(document.metadata.comments[0].timestamp).toBeDefined();
    });
  });
  
  describe('shareWith', () => {
    test('should add user to shared list', () => {
      const document = {
        metadata: {
          sharedWith: []
        },
        data: {}
      };
      
      documentManager.shareWith(document, 'user@example.com', 'editor');
      
      expect(document.metadata.sharedWith).toHaveLength(1);
      expect(document.metadata.sharedWith[0].email).toBe('user@example.com');
      expect(document.metadata.sharedWith[0].role).toBe('editor');
    });
    
    test('should not duplicate users', () => {
      const document = {
        metadata: {
          sharedWith: [
            { email: 'user@example.com', role: 'viewer' }
          ]
        },
        data: {}
      };
      
      documentManager.shareWith(document, 'user@example.com', 'editor');
      
      expect(document.metadata.sharedWith).toHaveLength(1);
      expect(document.metadata.sharedWith[0].role).toBe('editor');
    });
  });
  
  describe('recordEdit', () => {
    test('should record edit in history', () => {
      const document = {
        metadata: {
          editHistory: []
        },
        data: {}
      };
      
      documentManager.recordEdit(document, 'field.path', 'old value', 'new value', 'user@example.com');
      
      expect(document.metadata.editHistory).toHaveLength(1);
      expect(document.metadata.editHistory[0].fieldPath).toBe('field.path');
      expect(document.metadata.editHistory[0].oldValue).toBe('old value');
      expect(document.metadata.editHistory[0].newValue).toBe('new value');
      expect(document.metadata.editHistory[0].author).toBe('user@example.com');
    });
  });
});
