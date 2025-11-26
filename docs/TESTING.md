# MDWriter Testing Guide

## Overview
MDWriter uses Jest as its testing framework to ensure code quality and reliability. The test suite includes unit tests for individual components and integration tests for end-to-end workflows.

## Running Tests

### Install Dependencies
Before running tests for the first time, install the test dependencies:

```powershell
npm install
```

### Run All Tests
```powershell
npm test
```

### Run Tests in Watch Mode
Automatically re-run tests when files change:

```powershell
npm run test:watch
```

### Run Tests with Coverage
Generate a code coverage report:

```powershell
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view detailed coverage information.

### Run Verbose Tests
Get detailed output for debugging:

```powershell
npm run test:verbose
```

## Test Structure

### Test Files
Tests are organized in the `tests/` directory and follow this naming convention:
- `*.test.js` - Unit tests for specific modules
- `*.spec.js` - Alternative test file extension
- `integration.test.js` - End-to-end integration tests

### Test Organization
```
tests/
├── setup.js                    # Global test configuration and mocks
├── schema-loader.test.js       # SchemaLoader tests
├── document-manager.test.js    # DocumentManager tests
├── template-manager.test.js    # TemplateManager tests
├── config-manager.test.js      # ConfigManager tests
├── form-generator.test.js      # FormGenerator tests
├── menu-builder.test.js        # MenuBuilder tests
└── integration.test.js         # Integration tests
```

## Test Coverage

### Main Process Components
- **SchemaLoader** - Document type loading, schema validation, format validation
- **DocumentManager** - Document CRUD, validation, metadata management
- **TemplateManager** - Template loading, parsing, rendering
- **ConfigManager** - Configuration persistence, preferences
- **MenuBuilder** - Menu structure, platform-specific menus

### Renderer Process Components
- **FormGenerator** - Field generation, custom forms, validation

### Integration Tests
- Complete document lifecycle (create → validate → save → load)
- Document type discovery and usage
- Template rendering with document data
- Configuration persistence across sessions
- Schema validation with complex nested structures
- Collaboration metadata (comments, sharing, edit history)
- Export functionality

## Writing Tests

### Unit Test Example
```javascript
const { describe, test, expect, beforeEach } = require('@jest/globals');

describe('MyClass', () => {
  let instance;
  
  beforeEach(() => {
    instance = new MyClass();
  });
  
  test('should do something', () => {
    const result = instance.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### Integration Test Example
```javascript
test('should complete full workflow', async () => {
  // Setup
  const schemaLoader = new SchemaLoader();
  const docManager = new DocumentManager(schemaLoader);
  
  // Execute workflow
  await schemaLoader.loadDocumentTypes();
  const doc = await docManager.createNew('mdf');
  doc.data.title = 'Test';
  
  await docManager.save('/path/doc.mdf', doc);
  const loaded = await docManager.load('/path/doc.mdf');
  
  // Verify
  expect(loaded.data.title).toBe('Test');
});
```

## Mocking

### Electron Mocks
Electron modules are mocked in `tests/setup.js`:
- `app.getPath()` - Returns mock paths
- `BrowserWindow` - Mock window instance
- `ipcMain` - Mock IPC handlers
- `dialog` - Mock file dialogs

### Filesystem Mocks
The `fs.promises` module is mocked in individual test files:
```javascript
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));
```

### Custom Mocks
Use `jest.fn()` to create mock functions:
```javascript
const mockCallback = jest.fn();
mockCallback.mockResolvedValue('result');
mockCallback.mockRejectedValue(new Error('error'));
```

## Test Patterns

### Testing Async Functions
```javascript
test('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Handling
```javascript
test('should handle errors', async () => {
  await expect(
    functionThatThrows()
  ).rejects.toThrow('Error message');
});
```

### Testing with Mock Data
```javascript
beforeEach(() => {
  fs.readFile.mockResolvedValue(JSON.stringify({
    field: 'value'
  }));
});
```

## Continuous Integration

### GitHub Actions (Future)
Add a `.github/workflows/test.yml` file:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Clear mocks between tests

### 2. Descriptive Names
```javascript
// ✅ Good
test('should create document with required fields initialized')

// ❌ Bad
test('test1')
```

### 3. Test One Thing
Each test should verify one behavior:
```javascript
// ✅ Good
test('should validate required fields');
test('should validate field types');

// ❌ Bad
test('should validate everything');
```

### 4. Arrange-Act-Assert Pattern
```javascript
test('example', () => {
  // Arrange - setup
  const input = 'test';
  
  // Act - execute
  const result = process(input);
  
  // Assert - verify
  expect(result).toBe('expected');
});
```

### 5. Mock External Dependencies
Never rely on actual file system, network, or external services in tests.

### 6. Test Edge Cases
- Empty inputs
- Null/undefined values
- Boundary conditions
- Error conditions

## Debugging Tests

### Run Single Test File
```powershell
npx jest tests/schema-loader.test.js
```

### Run Single Test
```powershell
npx jest -t "should create document"
```

### Enable Verbose Logging
Uncomment console.error in `tests/setup.js` to see error output.

## Coverage Goals

Target coverage metrics:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View current coverage:
```powershell
npm run test:coverage
```

## Common Issues

### Issue: Tests hang
**Cause**: Async operation not completing
**Solution**: Ensure all promises are awaited or returned

### Issue: Mock not working
**Cause**: Mock defined after module import
**Solution**: Place `jest.mock()` before `require()`

### Issue: Electron module errors
**Cause**: Electron not properly mocked
**Solution**: Check `tests/setup.js` has correct mocks

## Adding New Tests

When adding a new module to MDWriter:

1. Create test file: `tests/module-name.test.js`
2. Import module and set up mocks
3. Write tests for all public methods
4. Test error conditions
5. Add integration tests if needed
6. Run coverage to ensure adequate coverage

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Testing Electron Apps](https://www.electronjs.org/docs/latest/tutorial/testing)
- [Jest Mocking](https://jestjs.io/docs/mock-functions)

## Troubleshooting

### Windows-specific Issues
If tests fail on Windows due to path separators, use `path.join()` or normalize paths in tests.

### Node Version
Ensure you're using Node.js LTS (18.x or later) for compatibility.

### Clean Install
If tests fail unexpectedly:
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
npm test
```

---

**Note**: The test suite is designed to run in a Node.js environment with mocked Electron and filesystem dependencies. No actual Electron window is created during testing.
