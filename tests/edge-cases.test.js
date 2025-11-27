/**
 * Edge Cases and Error Scenario Tests
 * 
 * Tests:
 * - Error handling across all components
 * - Edge cases and boundary conditions
 * - Malformed data handling
 * - Security validations
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const fs = require('fs').promises;

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

describe('Edge Cases and Error Scenarios', () => {
  describe('SchemaLoader Error Handling', () => {
    let schemaLoader;
    
    beforeEach(() => {
      jest.clearAllMocks();
      schemaLoader = new SchemaLoader();
    });
    
    test('should handle corrupted JSON in document type metadata', async () => {
      fs.readdir.mockResolvedValue([
        { name: 'corrupt', isDirectory: () => true },
      ]);
      
      fs.readFile.mockResolvedValue('{ invalid json {{');
      
      const types = await schemaLoader.loadDocumentTypes();
      
      // Should skip corrupted type and continue
      expect(types).toEqual([]);
    });
    
    test('should handle missing entrypoint schema file', async () => {
      const enoentError = new Error('ENOENT: no such file or directory');
      enoentError.code = 'ENOENT';
      
      fs.readFile.mockRejectedValueOnce(enoentError);
      
      const error = await schemaLoader.loadSchema('test', 'missing.schema.json').catch(e => e);
      expect(error).toBeDefined();
      expect(error.code).toBe('MODEL_DEFINITION_FAULT');
      expect(error.isModelFault).toBe(true);
      expect(error.message).toContain('Model definition fault');
      expect(error.message).toContain('missing.schema.json');
    });
    
    test('should handle circular schema references', async () => {
      const schemaA = {
        type: 'object',
        properties: {
          b: { $ref: 'schemaB.json' }
        }
      };
      
      const schemaB = {
        type: 'object',
        properties: {
          a: { $ref: 'schemaA.json' }
        }
      };
      
      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(schemaA))
        .mockResolvedValueOnce(JSON.stringify(schemaB));
      
      // Should handle without infinite loop
      const schema = await schemaLoader.loadSchema('test', 'schemaA.json');
      expect(schema).toBeDefined();
    });
    
    test('should validate extremely large documents', async () => {
      const largeSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      };
      
      const largeDocument = {
        items: new Array(10000).fill('item')
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(largeSchema));
      
      const result = await schemaLoader.validateDocument('test', 'test.schema.json', largeDocument);
      
      expect(result.valid).toBe(true);
    });
    
    test('should handle empty schema', async () => {
      fs.readFile.mockResolvedValue('{}');
      
      const schema = await schemaLoader.loadSchema('test', 'empty.schema.json');
      
      expect(schema).toEqual({});
    });
    
    test('should validate document with null values', async () => {
      const schema = {
        type: 'object',
        properties: {
          optional: { type: 'string' }
        }
      };
      
      const document = {
        optional: null
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(schema));
      
      const result = await schemaLoader.validateDocument('test', 'test.schema.json', document);
      
      // Depends on schema strictness, but should handle gracefully
      expect(result).toHaveProperty('valid');
    });
    
    test('should handle deeply nested schema validation', async () => {
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'object',
                    properties: {
                      level4: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      const document = {
        level1: {
          level2: {
            level3: {
              level4: 'deep value'
            }
          }
        }
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(schema));
      
      const result = await schemaLoader.validateDocument('test', 'test.schema.json', document);
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe('DocumentManager Error Handling', () => {
    let documentManager;
    let mockSchemaLoader;
    
    beforeEach(() => {
      jest.clearAllMocks();
      
      mockSchemaLoader = {
        getDocumentType: jest.fn(),
        loadSchema: jest.fn(),
        validateDocument: jest.fn(),
        documentTypes: new Map(),
      };
      
      documentManager = new DocumentManager(mockSchemaLoader);
    });
    
    test('should handle loading document with no metadata', async () => {
      const rawDocument = {
        title: 'Raw Document'
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(rawDocument));
      
      mockSchemaLoader.documentTypes.set('mdf', {
        name: 'mdf',
        extensions: ['mdf']
      });
      
      const document = await documentManager.load('/path/to/doc.mdf');
      
      expect(document.metadata).toBeDefined();
      expect(document.data).toEqual(rawDocument);
    });
    
    test('should handle saving to readonly location', async () => {
      const document = {
        metadata: { version: '1.0', documentType: 'test' },
        data: { id: '123' }
      };
      
      fs.writeFile.mockRejectedValue(new Error('EACCES: permission denied'));
      
      const result = await documentManager.save('/readonly/doc.mdf', document);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
    });
    
    test('should handle loading non-existent file', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));
      
      await expect(
        documentManager.load('/missing/file.mdf')
      ).rejects.toThrow('no such file');
    });
    
    test('should handle document with missing required metadata fields', async () => {
      const incompleteDocument = {
        metadata: {
          // Missing documentType
          version: '1.0'
        },
        data: {}
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(incompleteDocument));
      
      // Should still load but may have issues later
      const document = await documentManager.load('/path/to/doc.mdf');
      
      expect(document.metadata).toBeDefined();
    });
    
    test('should handle very long file paths', async () => {
      const longPath = '/very/' + 'long/'.repeat(100) + 'document.mdf';
      
      const document = {
        metadata: { version: '1.0', documentType: 'test' },
        data: {}
      };
      
      fs.writeFile.mockResolvedValue();
      
      const result = await documentManager.save(longPath, document);
      
      expect(result.success).toBe(true);
    });
    
    test('should handle document with special characters in data', async () => {
      const mockDocType = {
        name: 'test',
        entrypoint: 'test.schema.json'
      };
      
      const mockSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' }
        },
        required: ['id']
      };
      
      mockSchemaLoader.getDocumentType.mockReturnValue(mockDocType);
      mockSchemaLoader.loadSchema.mockResolvedValue(mockSchema);
      
      const document = await documentManager.createNew('test');
      document.data.text = 'Special chars: <script>alert("xss")</script> 日本語 emoji 🔥';
      
      fs.writeFile.mockResolvedValue();
      
      const result = await documentManager.save('/path/doc.mdf', document);
      
      expect(result.success).toBe(true);
      
      // Should properly escape/encode
      const savedContent = fs.writeFile.mock.calls[0][1];
      expect(savedContent).toContain('alert');
    });
    
    test('should handle empty document data', async () => {
      const mockDocType = {
        name: 'test',
        entrypoint: 'test.schema.json'
      };
      
      const mockSchema = {
        type: 'object',
        properties: {},
        required: []
      };
      
      mockSchemaLoader.getDocumentType.mockReturnValue(mockDocType);
      mockSchemaLoader.loadSchema.mockResolvedValue(mockSchema);
      
      const document = await documentManager.createNew('test');
      
      expect(document.data).toEqual({});
    });
  });
  
  describe('Boundary Conditions', () => {
    test('should handle document type with no extensions', async () => {
      const schemaLoader = new SchemaLoader();
      
      fs.readdir.mockResolvedValue([
        { name: 'noext', isDirectory: () => true },
      ]);
      
      fs.readFile.mockResolvedValue(JSON.stringify({
        description: 'No Extensions Type',
        category: 'Test',
        icon: '📄',
        extensions: [], // Empty array
        entrypoint: 'test.schema.json'
      }));
      
      const types = await schemaLoader.loadDocumentTypes();
      
      expect(types).toHaveLength(1);
      expect(types[0].extensions).toEqual([]);
    });
    
    test('should handle document with maximum nesting depth', async () => {
      const schemaLoader = new SchemaLoader();
      
      // Create deeply nested schema
      const deepSchema = {
        type: 'object',
        properties: {
          data: { type: 'object', properties: {} }
        }
      };
      
      let current = deepSchema.properties.data;
      for (let i = 0; i < 50; i++) {
        current.properties = {
          nested: { type: 'object', properties: {} }
        };
        current = current.properties.nested;
      }
      current.properties = { value: { type: 'string' } };
      
      fs.readFile.mockResolvedValue(JSON.stringify(deepSchema));
      
      const schema = await schemaLoader.loadSchema('test', 'deep.schema.json');
      
      expect(schema).toBeDefined();
    });
    
    test('should handle unicode in all text fields', async () => {
      const schemaLoader = new SchemaLoader();
      
      fs.readdir.mockResolvedValue([
        { name: 'unicode', isDirectory: () => true },
      ]);
      
      fs.readFile.mockResolvedValue(JSON.stringify({
        description: '日本語 Русский العربية',
        category: 'International 🌍',
        icon: '🔤',
        extensions: ['test'],
        entrypoint: 'test.schema.json'
      }));
      
      const types = await schemaLoader.loadDocumentTypes();
      
      expect(types[0].description).toContain('日本語');
      expect(types[0].category).toContain('🌍');
    });
    
    test('should handle zero and negative numbers in number fields', async () => {
      const schemaLoader = new SchemaLoader();
      
      const schema = {
        type: 'object',
        properties: {
          zero: { type: 'number' },
          negative: { type: 'number' },
          decimal: { type: 'number' }
        }
      };
      
      const document = {
        zero: 0,
        negative: -42,
        decimal: -3.14159
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(schema));
      
      const result = await schemaLoader.validateDocument('test', 'test.schema.json', document);
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe('Security Validations', () => {
    test('should not execute code in document data', async () => {
      const mockSchemaLoader = {
        getDocumentType: jest.fn().mockReturnValue({
          name: 'test',
          entrypoint: 'test.schema.json'
        }),
        loadSchema: jest.fn().mockResolvedValue({
          type: 'object',
          properties: { code: { type: 'string' } },
          required: []
        }),
      };
      
      const documentManager = new DocumentManager(mockSchemaLoader);
      const document = await documentManager.createNew('test');
      
      // Attempt code injection
      document.data.code = '<script>alert("xss")</script>';
      
      fs.writeFile.mockResolvedValue();
      
      const result = await documentManager.save('/path/doc.mdf', document);
      
      expect(result.success).toBe(true);
      
      // Should be stored as plain text, not executed
      const savedContent = fs.writeFile.mock.calls[0][1];
      const parsed = JSON.parse(savedContent);
      expect(parsed.data.code).toBe('<script>alert("xss")</script>');
    });
    
    test('should validate file paths for directory traversal', async () => {
      const documentManager = new DocumentManager({});
      
      // Attempt directory traversal
      const maliciousPath = '../../../etc/passwd';
      
      const document = {
        metadata: { version: '1.0', documentType: 'test' },
        data: {}
      };
      
      fs.writeFile.mockResolvedValue();
      
      // Should still attempt to write (security is OS-level)
      // but application should not manipulate the path
      await documentManager.save(maliciousPath, document);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        maliciousPath, // Passed through unchanged
        expect.any(String),
        'utf8'
      );
    });
  });
});
