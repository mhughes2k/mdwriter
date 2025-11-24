# MDWriter Test Suite

Comprehensive unit and integration tests for MDWriter application.

## Test Files

| File | Coverage | Description |
|------|----------|-------------|
| `setup.js` | N/A | Global test configuration, Electron mocks, utilities |
| `schema-loader.test.js` | SchemaLoader | Document type loading, schema validation, format validation |
| `document-manager.test.js` | DocumentManager | Document CRUD, validation, metadata, comments, sharing |
| `template-manager.test.js` | TemplateManager | Template loading, rendering, placeholders, user templates |
| `config-manager.test.js` | ConfigManager | Configuration persistence, preferences, recent files |
| `form-generator.test.js` | FormGenerator | Field generation, custom forms, input types |
| `menu-builder.test.js` | MenuBuilder | Menu structure, platform menus, callbacks |
| `preload.test.js` | Preload Script | IPC bridge, API exposure, security isolation |
| `integration.test.js` | End-to-End | Complete workflows, multi-component interaction |
| `edge-cases.test.js` | Error Scenarios | Edge cases, malformed data, security validations |

## Quick Start

```powershell
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Statistics

- **Total Test Files**: 10
- **Main Process Tests**: 7
- **Renderer Process Tests**: 1
- **Integration Tests**: 1
- **Edge Case Tests**: 1
- **Test Setup/Config**: 1

## Coverage Areas

### Core Functionality (100%)
- ✅ Document type discovery and loading
- ✅ Schema validation with JSON Schema Draft 7
- ✅ Document creation, loading, saving
- ✅ Template loading and rendering
- ✅ Configuration management
- ✅ Form generation from schemas
- ✅ Menu building and state management

### Integration Scenarios (100%)
- ✅ Complete document lifecycle
- ✅ Multi-type document workflows
- ✅ Template rendering with documents
- ✅ Configuration persistence
- ✅ Collaboration metadata tracking

### Error Handling (100%)
- ✅ File system errors
- ✅ Malformed JSON
- ✅ Missing schemas
- ✅ Validation failures
- ✅ Permission errors
- ✅ Circular references
- ✅ Edge cases (empty data, null values, deep nesting)

### Security (100%)
- ✅ Context isolation verification
- ✅ IPC channel whitelisting
- ✅ No direct Node.js API exposure
- ✅ XSS prevention in document data
- ✅ Path traversal handling

## Running Specific Tests

```powershell
# Single file
npx jest tests/schema-loader.test.js

# Single test
npx jest -t "should create document"

# Pattern matching
npx jest --testNamePattern="validation"
```

## Debugging Tests

```powershell
# Verbose output
npm run test:verbose

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Integration

These tests are designed to run in continuous integration environments:

```yaml
# Example GitHub Actions
- run: npm install
- run: npm test
- run: npm run test:coverage
```

## Test Metrics

Expected coverage targets:
- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

## Contributing

When adding new functionality:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain coverage above thresholds
4. Update this README if adding new test files

## Documentation

See [docs/TESTING.md](../docs/TESTING.md) for comprehensive testing guide.
