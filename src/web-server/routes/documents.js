/**
 * Documents API Routes
 * 
 * REST endpoints for document operations
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/documents
 * List all stored documents
 */
router.get('/', async (req, res, next) => {
  try {
    const storageService = req.app.get('storageService');
    const result = await storageService.listDocuments();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents
 * Create a new document
 */
router.post('/', async (req, res, next) => {
  try {
    const { documentType } = req.body;
    
    if (!documentType) {
      return res.status(400).json({ success: false, error: 'Document type is required' });
    }
    
    const schemaService = req.app.get('schemaService');
    const storageService = req.app.get('storageService');
    
    // Create empty document
    const document = await schemaService.createEmptyDocument(documentType);
    
    // Optionally save to storage
    if (req.body.save) {
      const documentId = storageService.generateId();
      await storageService.saveDocument(documentId, document);
      document.id = documentId;
    }
    
    res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id
 * Get a document by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const storageService = req.app.get('storageService');
    const result = await storageService.loadDocument(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/documents/:id
 * Update a document
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { document } = req.body;
    
    if (!document) {
      return res.status(400).json({ success: false, error: 'Document is required' });
    }
    
    const storageService = req.app.get('storageService');
    const result = await storageService.saveDocument(req.params.id, document);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const storageService = req.app.get('storageService');
    const result = await storageService.deleteDocument(req.params.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/parse
 * Parse document content from file upload
 */
router.post('/parse', async (req, res, next) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    
    const schemaService = req.app.get('schemaService');
    const storageService = req.app.get('storageService');
    
    // Parse the content
    const parseResult = storageService.parseDocument(content);
    
    if (!parseResult.success) {
      return res.status(400).json(parseResult);
    }
    
    if (parseResult.document) {
      // Full document format
      return res.json({ 
        success: true, 
        document: parseResult.document 
      });
    }
    
    // Raw data - try to infer type and wrap
    const documentType = await schemaService.inferDocumentType(parseResult.rawData);
    
    if (!documentType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Unable to determine document type from the data' 
      });
    }
    
    const document = {
      metadata: {
        version: '1.0',
        documentType,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        author: '',
        renderOrder: null,
        hiddenFields: [],
        activeTemplate: null,
        comments: [],
        sharedWith: [],
        editHistory: []
      },
      data: parseResult.rawData
    };
    
    res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/validate
 * Validate a document against its schema
 */
router.post('/validate', async (req, res, next) => {
  try {
    const document = req.body;
    
    if (!document || !document.metadata || !document.data) {
      return res.status(400).json({ success: false, error: 'Invalid document format' });
    }
    
    const schemaService = req.app.get('schemaService');
    const result = await schemaService.validate(document.metadata.documentType, document.data);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/import
 * Import clean JSON into a document
 */
router.post('/import', async (req, res, next) => {
  try {
    const { content, existingDocument } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    
    const schemaService = req.app.get('schemaService');
    
    // Parse content
    let jsonData;
    try {
      jsonData = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid JSON content' });
    }
    
    let documentType;
    
    if (existingDocument) {
      // Importing into existing document
      documentType = existingDocument.metadata.documentType;
    } else {
      // Try to infer type
      documentType = await schemaService.inferDocumentType(jsonData);
      
      if (!documentType) {
        return res.status(400).json({ 
          success: false, 
          error: 'Unable to determine document type from the data' 
        });
      }
    }
    
    // Validate
    const validation = await schemaService.validate(documentType, jsonData);
    
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message || JSON.stringify(e)).join(', ');
      return res.status(400).json({ 
        success: false, 
        error: `Validation failed: ${errorMessages}` 
      });
    }
    
    if (existingDocument) {
      // Merge into existing
      existingDocument.data = jsonData;
      existingDocument.metadata.modified = new Date().toISOString();
      return res.json({ success: true, document: existingDocument });
    }
    
    // Create new document
    const document = {
      metadata: {
        version: '1.0',
        documentType,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        author: '',
        renderOrder: null,
        hiddenFields: [],
        activeTemplate: null,
        comments: [],
        sharedWith: [],
        editHistory: []
      },
      data: jsonData
    };
    
    res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
