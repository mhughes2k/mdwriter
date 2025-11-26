#!/usr/bin/env node
/**
 * Test to debug schema loading differences between test script and app
 */

const fs = require('fs').promises;
const path = require('path');
const { SchemaLoader } = require('./src/main/schema-loader');

async function testSchemaLoading() {
  try {
    console.log('\n=== Testing Schema Loading ===\n');
    
    // Initialize SchemaLoader
    const schemaLoader = new SchemaLoader();
    const modelsPath = path.join(__dirname, 'models');
    
    console.log('Models path:', modelsPath);
    
    // Check what files exist
    const mdfSchemaDir = path.join(modelsPath, 'mdf', 'json-schema');
    console.log('\nFiles in MDF schema directory:');
    const files = await fs.readdir(mdfSchemaDir);
    files.forEach(f => console.log('  -', f));
    
    // Load document types
    console.log('\nLoading document types...');
    await schemaLoader.loadDocumentTypes();
    console.log('✓ Document types loaded');
    
    // Get the mdf type
    const mdfType = schemaLoader.getDocumentType('mdf');
    console.log('\nMDF Type Info:');
    console.log('  entrypoint:', mdfType.entrypoint);
    console.log('  path:', mdfType.path);
    
    // Try to get validator - this will trigger schema loading
    console.log('\n=== Getting Validator (this will load all schemas) ===');
    const validator = await schemaLoader.getValidator('mdf');
    console.log('✓ Validator obtained');
    
    // Test validation with a minimal document
    console.log('\n=== Testing Validation ===');
    const testDoc = {
      id: 'test-1',
      title: 'Test Module'
    };
    
    const result = await schemaLoader.validate('mdf', testDoc);
    console.log('Validation result:', result.valid);
    if (!result.valid) {
      console.log('Errors:');
      result.errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err.instancePath || '(root)'}: ${err.message}`);
      });
    }
    
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error.message);
    console.error(error.stack);
  }
}

testSchemaLoading();
