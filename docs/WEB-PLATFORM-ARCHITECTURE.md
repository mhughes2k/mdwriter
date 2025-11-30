# Web Platform Architecture

This document outlines the pluggable backend architecture for MDWriter, enabling it to run as an Electron desktop app, web browser application, or be embedded in any other platform.

## Overview

MDWriter uses a **pluggable backend architecture** that allows any platform to provide its own implementation. The editor is completely decoupled from the backend, making it reusable across:

1. **Electron mode**: Desktop application with native capabilities
2. **Web mode**: Browser-based with a REST API backend
3. **Custom platforms**: Any platform can inject their own backend

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MDWriter Editor                       │
│  (renderer.js, form-generator.js, collaboration, etc.)  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Uses window.platformAPI
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Platform Backend Interface                  │
│                                                          │
│  Defined contract that all backends must implement:      │
│  - Document operations (create, load, save, validate)   │
│  - Schema operations (types, structure, custom forms)   │
│  - Configuration (get, set, preferences)                │
│  - Templates (load, render, create)                     │
│  - Collaboration (host, join, discovery)                │
│  - Events and menu actions                              │
└─────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ ElectronBackend │ │   WebBackend    │ │  CustomBackend  │
│                 │ │                 │ │                 │
│ - IPC calls     │ │ - REST API      │ │ - Your impl     │
│ - Native dialog │ │ - localStorage  │ │ - Your storage  │
│ - File system   │ │ - File downloads│ │ - Your API      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Using MDWriter in Your Platform

### Option 1: Use the built-in WebBackend

If you just need a web-based editor with our REST API:

```javascript
// The editor auto-initializes with WebBackend when no electronAPI is present
// Just include the scripts and it works
<script src="platform-api.js"></script>
<script src="renderer.js"></script>
```

### Option 2: Inject your own backend

To integrate MDWriter into your platform with custom storage/API:

```javascript
// 1. Create your backend implementing the interface
const myBackend = {
  platform: 'my-platform',
  isElectron: false,
  isWeb: true,
  
  // Document Type Operations
  async getDocumentTypes() {
    return await myAPI.fetchDocumentTypes();
  },
  
  async getSchemaStructure(documentType) {
    return await myAPI.fetchSchema(documentType);
  },
  
  async getCustomFormData(documentType, formName) {
    return await myAPI.fetchCustomForm(documentType, formName);
  },
  
  // Document Operations
  async createNewDocument(documentType) {
    return await myAPI.createDocument(documentType);
  },
  
  async loadDocument(id) {
    return await myAPI.loadDocument(id);
  },
  
  async saveDocument(id, document) {
    return await myAPI.saveDocument(id, document);
  },
  
  async validateDocument(document) {
    return await myAPI.validate(document);
  },
  
  // ... implement all required methods
};

// 2. Register it BEFORE the editor scripts load
window.MDWriter = window.MDWriter || {};
window.MDWriter.registerBackend(myBackend);

// 3. Include the editor scripts (they'll use your backend)
```

### Option 3: Extend the built-in backends

```javascript
// Create a customized version of WebBackend
const { WebBackend } = window.MDWriter;

class MyCustomBackend extends WebBackend {
  constructor() {
    super({ apiBase: 'https://my-api.com/v1' });
  }
  
  // Override specific methods
  async saveDocument(filePath, document) {
    // Add custom logic (e.g., analytics, transforms)
    console.log('Saving document:', document.metadata.documentType);
    return super.saveDocument(filePath, document);
  }
  
  async configGet(key) {
    // Use your own config storage
    return { success: true, value: myConfigStore.get(key) };
  }
}

window.MDWriter.registerBackend(new MyCustomBackend());
```

## Backend Interface Reference

Every backend must implement these methods:

### Platform Identification

```typescript
platform: string;      // e.g., 'electron', 'web', 'my-platform'
isElectron: boolean;
isWeb: boolean;
```

### Document Type Operations

```typescript
getDocumentTypes(): Promise<DocumentType[]>
getSchemaStructure(documentType: string): Promise<SchemaProperty[]>
getCustomFormData(documentType: string, formName: string): Promise<CustomFormData>
```

### Document Operations

```typescript
createNewDocument(documentType: string): Promise<{success: boolean, document?: Document}>
openDocumentDialog(): Promise<{success: boolean, filePath?: string, content?: string}>
loadDocument(filePathOrContent: string | {content: string}): Promise<{success: boolean, document?: Document}>
saveDocumentDialog(isExport: boolean, defaultPath?: string): Promise<{success: boolean, filePath?: string}>
saveDocument(filePath: string, document: Document): Promise<{success: boolean}>
exportDocument(filePath: string, document: Document): Promise<{success: boolean}>
validateDocument(document: Document): Promise<{valid: boolean, errors?: ValidationError[]}>
showUnsavedChangesDialog(): Promise<{choice: number}> // 0=Save, 1=Don't Save, 2=Cancel
```

### Document Editing

```typescript
updateField(document: Document, fieldPath: string, value: any): Promise<{success: boolean, document?: Document}>
addArrayItem(document: Document, arrayPath: string, item: any): Promise<{success: boolean, document?: Document}>
removeArrayItem(document: Document, arrayPath: string, index: number): Promise<{success: boolean, document?: Document}>
addComment(document: Document, comment: string, sectionPath?: string): Promise<{success: boolean, document?: Document}>
```

### Configuration

```typescript
configGet(key: string): Promise<{success: boolean, value?: any}>
configSet(key: string, value: any): Promise<{success: boolean}>
configGetAll(): Promise<{success: boolean, config?: object}>
configGetPreference(key: string, defaultValue?: any): Promise<{success: boolean, value?: any}>
configSetPreference(key: string, value: any): Promise<{success: boolean}>
configAddRecentFile(filePath: string): Promise<{success: boolean}>
configGetRecentFiles(): Promise<{success: boolean, files?: string[]}>
```

### Templates

```typescript
templatesLoad(documentType: string): Promise<{success: boolean, templates?: Template[]}>
templatesRender(templateId: string, documentData: object, documentType: string): Promise<{success: boolean, content?: string}>
templatesCreate(documentType: string, name: string, content: string): Promise<{success: boolean}>
templatesSetActive(templateId: string): Promise<{success: boolean}>
templatesGetActive(): Promise<{success: boolean, templateId?: string}>
```

### Collaboration

```typescript
collabHostSession(document: Document, metadata: object): Promise<{success: boolean, session?: Session}>
collabStopHosting(): Promise<{success: boolean}>
collabStartDiscovery(): Promise<{success: boolean}>
collabStopDiscovery(): Promise<{success: boolean}>
collabGetDiscoveredSessions(): Promise<{success: boolean, sessions?: Session[]}>
collabGetCurrentSession(): Promise<{success: boolean, session?: Session}>
```

### Events

```typescript
onEvent(event: string, callback: Function): void
onMenuAction(action: string, callback: Function): void
removeMenuListener(action: string, callback: Function): void
sendLog(level: string, args: any[]): void
```

## Validation

You can validate your backend implementation:

```javascript
const validation = window.MDWriter.validateBackend(myBackend);
if (!validation.valid) {
  console.warn('Missing methods:', validation.missing);
}
```

## Security Considerations

### Prototype Pollution Protection

The WebBackend includes protection against prototype pollution in document manipulation:

```javascript
// These paths are blocked:
- __proto__
- constructor
- prototype
```

### Production Deployment

For production web deployments:

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to restrict origins
- [ ] Add rate limiting middleware
- [ ] Implement user authentication
- [ ] Set up HTTPS/TLS
- [ ] Configure secure session management

## File Structure

```
src/
├── renderer/
│   ├── platform-api.js      # Backend interface + built-in backends
│   ├── renderer.js          # Uses window.platformAPI
│   ├── form-generator.js    # Uses window.platformAPI
│   └── collaboration-*.js   # Uses window.platformAPI
└── web-server/
    ├── server.js            # Express server for WebBackend
    ├── routes/              # REST API routes
    └── services/            # Schema and storage services
```

## Usage Examples

### Running in Electron

```bash
npm start
# Auto-detects Electron and uses ElectronBackend
```

### Running as Web App

```bash
npm run start:web
# Starts Express server, auto-uses WebBackend
```

### Embedding in Your Platform

```html
<!-- Your page -->
<script>
  // Register your backend before loading MDWriter
  window.MDWriter = {
    registerBackend: function(backend) {
      window._mdwriterBackend = backend;
    }
  };
  
  // Your backend implementation
  window.MDWriter.registerBackend({
    platform: 'my-lms',
    isElectron: false,
    isWeb: true,
    async getDocumentTypes() { /* ... */ },
    // ... implement all methods
  });
</script>

<!-- Then load MDWriter -->
<script src="path/to/platform-api.js"></script>
<script src="path/to/renderer.js"></script>
```
