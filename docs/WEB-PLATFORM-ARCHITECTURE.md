# Web Platform Architecture

This document outlines the architecture for enabling MDWriter to run both as an Electron desktop application and as a web browser application.

## Overview

The goal is to allow MDWriter to function:
1. **Desktop mode**: As an Electron application (current implementation)
2. **Web mode**: In a web browser, with a backend server for persistence

## Architecture Strategy

### Platform Abstraction Layer

The core strategy is to create a **Platform API** abstraction that provides a consistent interface for platform-specific operations. This abstraction layer sits between the renderer code and the platform-specific implementations.

```
┌────────────────────────────────────────────────────────┐
│                   Renderer Code                         │
│  (renderer.js, form-generator.js, etc.)                │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│               Platform API Interface                    │
│  (src/renderer/platform-api.js)                        │
│  - Unified API for all platform operations             │
└────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Electron Backend     │     │   Web Backend         │
│  (preload.js)         │     │   (web-api.js)        │
│  - IPC to main        │     │   - HTTP/REST calls   │
│  - Native dialogs     │     │   - IndexedDB/Server  │
└──────────────────────┘     └──────────────────────┘
```

### Key Components

#### 1. Platform API Interface (`src/renderer/platform-api.js`)

A unified interface that exposes all platform operations:

```javascript
// Platform operations interface
const PlatformAPI = {
  // Document operations
  getDocumentTypes: () => Promise<DocumentType[]>,
  getSchemaStructure: (type) => Promise<SchemaProperty[]>,
  createNewDocument: (type) => Promise<Result>,
  loadDocument: (filePath) => Promise<Result>,
  saveDocument: (filePath, document) => Promise<Result>,
  exportDocument: (filePath, document) => Promise<Result>,
  validateDocument: (document) => Promise<ValidationResult>,
  
  // File dialogs
  openDocumentDialog: () => Promise<DialogResult>,
  saveDocumentDialog: (isExport, defaultPath) => Promise<DialogResult>,
  
  // Configuration
  configGet: (key) => Promise<Value>,
  configSet: (key, value) => Promise<void>,
  
  // Templates
  templatesLoad: (documentType) => Promise<Template[]>,
  templatesRender: (templateId, data, type) => Promise<string>,
  
  // Platform info
  platform: string,
  isWeb: boolean,
  isElectron: boolean
};
```

#### 2. Electron Implementation (existing `preload.js`)

The current Electron implementation via `window.electronAPI` will be wrapped by the platform API when running in Electron mode.

#### 3. Web Implementation (`src/web/web-api.js`)

A new implementation that communicates with a web backend server:

```javascript
const WebAPI = {
  async getDocumentTypes() {
    const response = await fetch('/api/document-types');
    return response.json();
  },
  
  async loadDocument(documentId) {
    const response = await fetch(`/api/documents/${documentId}`);
    return response.json();
  },
  
  // Web-specific file handling using File API and IndexedDB
  async openDocumentDialog() {
    // Use <input type="file"> for file selection
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.mdf,.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          resolve({ success: true, file });
        } else {
          resolve({ success: false });
        }
      };
      input.click();
    });
  }
};
```

#### 4. Web Backend Server (`src/web-server/`)

A Node.js Express server that provides:

- REST API endpoints for document operations
- Schema loading and validation
- File storage (local filesystem or cloud storage)
- User session management
- WebSocket support for collaboration

## Directory Structure

```
src/
├── main/                      # Electron main process (existing)
├── preload/                   # Electron preload (existing)
├── renderer/                  # Renderer code (existing + modifications)
│   ├── platform-api.js        # NEW: Platform abstraction layer
│   └── ...
├── shared/                    # NEW: Code shared between platforms
│   ├── document-manager.js    # Document operations (refactored)
│   ├── schema-loader.js       # Schema loading (refactored)
│   └── validation.js          # Validation logic
├── web/                       # NEW: Web-specific client code
│   └── web-api.js             # Web API implementation
└── web-server/                # NEW: Web backend server
    ├── server.js              # Express server entry point
    ├── routes/
    │   ├── documents.js       # Document CRUD routes
    │   ├── schemas.js         # Schema routes
    │   └── templates.js       # Template routes
    └── services/
        ├── storage.js         # File/data storage service
        └── collaboration.js   # WebSocket collaboration
```

## Implementation Steps

### Phase 1: Create Platform Abstraction Layer

1. Create `src/renderer/platform-api.js` that detects the runtime environment
2. Wrap `window.electronAPI` calls for Electron mode
3. Create stub implementation for web mode

### Phase 2: Refactor Shared Code

1. Move business logic from `main/` to `shared/`
2. Make `schema-loader.js` and `document-manager.js` work without Node.js-specific APIs
3. Create browser-compatible validation using bundled Ajv

### Phase 3: Build Web Backend

1. Create Express server with REST API
2. Implement document storage service
3. Add WebSocket support for collaboration
4. Port schema loading to server

### Phase 4: Web Client Implementation

1. Implement `web-api.js` with fetch-based API calls
2. Add file upload/download handling
3. Add IndexedDB for local document caching (offline support)

### Phase 5: Build Configuration

1. Add Vite/Webpack config for web bundle
2. Configure separate entry points for web and Electron
3. Add environment-specific configuration

## API Differences

### File Operations

| Operation | Electron | Web |
|-----------|----------|-----|
| Open File | Native dialog + fs.readFile | `<input type="file">` + FileReader |
| Save File | Native dialog + fs.writeFile | `<a download>` or server upload |
| List Recent | Electron config | LocalStorage/IndexedDB |

### Configuration

| Storage | Electron | Web |
|---------|----------|-----|
| User Prefs | App data directory | LocalStorage |
| Documents | Local filesystem | Server storage |
| Templates | Local + bundled | Server + bundled |

## Web-Specific Features

### File Handling

The web version will handle files differently:

1. **Opening files**: 
   - Use HTML5 File API (`<input type="file">`)
   - Read file content with FileReader
   - Parse and validate JSON

2. **Saving files**: 
   - Generate download link with Blob URL
   - Or save to server with document ID

3. **Recent files**: 
   - Store document IDs in LocalStorage
   - Fetch document list from server

### Collaboration

For web mode, collaboration will work through:
- WebSocket connection to the web backend
- Same Socket.io protocol as Electron version
- Server acts as collaboration hub

## Security Considerations

### Web Mode

1. **Authentication**: Implement user authentication for web server
2. **CORS**: Configure appropriate CORS headers (restricted in production)
3. **Input validation**: Validate all API inputs on server
4. **File uploads**: Sanitize uploaded files, check size limits
5. **Rate limiting**: Add rate limiting middleware for production deployments to prevent DoS attacks on API endpoints (e.g., using `express-rate-limit`)

### Both Modes

1. **Schema validation**: Always validate documents against schema
2. **Content sanitization**: Sanitize markdown/HTML output
3. **CSP**: Maintain Content Security Policy headers
4. **Prototype pollution**: Guard against prototype pollution in object path manipulation

## Production Deployment Checklist

For deploying the web server in production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` environment variable to restrict origins
- [ ] Add rate limiting middleware
- [ ] Set up HTTPS/TLS
- [ ] Implement user authentication
- [ ] Configure secure session management
- [ ] Set up proper logging and monitoring

## Testing Strategy

1. **Unit tests**: Test shared code independently
2. **Integration tests**: Test platform API with both implementations
3. **E2E tests**: Playwright for web, Spectron for Electron

## Migration Path

1. Start with Phase 1 (abstraction layer) - minimal changes to existing code
2. Gradually refactor to use shared modules
3. Add web server when backend is ready
4. Both modes can be developed and tested in parallel
