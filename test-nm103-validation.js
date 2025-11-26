#!/usr/bin/env node
/**
 * Quick test script to validate NM103.mdf loads without schema reference errors
 */

const fs = require('fs').promises;
const path = require('path');
const { SchemaLoader } = require('./src/main/schema-loader');
const DocumentManager = require('./src/main/document-manager');

async function testNM103Validation() {
  // Set a timeout to prevent hanging
  const timeout = setTimeout(() => {
    console.error('TIMEOUT: Test hung for 10 seconds');
    process.exit(1);
  }, 10000);

  try {
    console.log('\n=== Testing NM103.mdf Validation ===\n');
    
    // Initialize SchemaLoader
    const schemaLoader = new SchemaLoader();
    const modelsPath = path.join(__dirname, 'models');
    await schemaLoader.loadDocumentTypes(modelsPath);
    console.log('✓ Document types loaded');
    
    // Initialize DocumentManager
    const docManager = new DocumentManager(schemaLoader);
    
    // Load NM103.mdf
    const nm103Path = path.join(__dirname, '..', 'documents', 'NM103.mdf');
    console.log(`Loading document from: ${nm103Path}`);
    const document = await docManager.load(nm103Path);
    console.log('✓ Document loaded successfully');
    
    // Debug: Print schema info
    console.log('\n--- Schema Debug Info ---');
    const mdfType = schemaLoader.getDocumentType('mdf');
    console.log('MDF entrypoint:', mdfType?.entrypoint);
    
    // Try to get the validator
    console.log('\nGetting validator...');
    try {
      const validator = await schemaLoader.getValidator('mdf');
      console.log('✓ Validator obtained');
    } catch (error) {
      console.error('Error getting validator:', error.message);
      console.error(error.stack);
      throw error;
    }
    
    // Validate the document
    console.log('\nValidating document against schema...');
    const result = await docManager.validate(document);
    
    if (result.valid) {
      console.log('✓ Document validation PASSED');
      console.log('\n=== SUCCESS ===');
      console.log('NM103.mdf validates successfully without schema reference errors!\n');
      process.exit(0);
    } else {
      console.log('✗ Document validation FAILED');
      console.log('\nValidation errors:');
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.message || err.dataPath || err.keyword}`);
      });
      console.log('\n=== FAILURE ===\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Error during validation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testNM103Validation();
