/**
 * Schemas API Routes
 * 
 * REST endpoints for schema and document type operations
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/schemas
 * Alias for /api/document-types
 */
router.get('/', async (req, res, next) => {
  try {
    const schemaService = req.app.get('schemaService');
    const documentTypes = schemaService.getDocumentTypes();
    res.json(documentTypes);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/schemas/:type
 * Get document type metadata
 */
router.get('/:type', async (req, res, next) => {
  try {
    const schemaService = req.app.get('schemaService');
    const docType = schemaService.getDocumentType(req.params.type);
    
    if (!docType) {
      return res.status(404).json({ success: false, error: 'Document type not found' });
    }
    
    res.json({ success: true, documentType: docType });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/schemas/:type/structure
 * Get schema structure for UI generation
 */
router.get('/:type/structure', async (req, res, next) => {
  try {
    const schemaService = req.app.get('schemaService');
    const structure = await schemaService.getSchemaStructure(req.params.type);
    res.json(structure);
  } catch (err) {
    if (err.message.includes('Unknown document type')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/schemas/:type/custom-forms/:formName
 * Get custom form data
 */
router.get('/:type/custom-forms/:formName', async (req, res, next) => {
  try {
    const schemaService = req.app.get('schemaService');
    const result = await schemaService.getCustomFormData(req.params.type, req.params.formName);
    
    if (result.error) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Also mount document-types endpoint at the API root level
// This is handled in the main server.js

module.exports = router;

// Additional export for document-types route
module.exports.documentTypesHandler = async (req, res, next) => {
  try {
    const schemaService = req.app.get('schemaService');
    const documentTypes = schemaService.getDocumentTypes();
    res.json(documentTypes);
  } catch (err) {
    next(err);
  }
};
