# MDWriter Integration Guide

This guide explains how to integrate the MDWriter editor into your own web application. MDWriter uses a pluggable backend architecture that allows you to provide your own storage, authentication, and API implementations.

## Table of Contents

1. [Quick Start](#quick-start)
2. [HTML Setup](#html-setup)
3. [Required Files](#required-files)
4. [Backend Implementation](#backend-implementation)
5. [Complete Integration Example](#complete-integration-example)
6. [API Reference](#api-reference)
7. [Styling and Customization](#styling-and-customization)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

The fastest way to integrate MDWriter is to:

1. Copy the required files to your project
2. Create a custom backend that implements your storage/API
3. Register your backend before loading the editor scripts
4. Include the HTML structure and scripts

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="path/to/mdwriter/styles.css">
</head>
<body>
  <!-- MDWriter container -->
  <div id="app">
    <!-- Editor HTML structure (see below) -->
  </div>

  <!-- 1. Register your backend FIRST -->
  <script>
    window.MDWriter = window.MDWriter || {};
    window.MDWriter.registerBackend(myCustomBackend);
  </script>

  <!-- 2. Then load MDWriter scripts -->
  <script src="path/to/mdwriter/platform-api.js"></script>
  <script src="path/to/mdwriter/renderer.js"></script>
</body>
</html>
```

---

## HTML Setup

### Minimal HTML Structure

MDWriter requires a specific HTML structure. Here's the minimal setup:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Application - Document Editor</title>
  
  <!-- MDWriter Styles -->
  <link rel="stylesheet" href="mdwriter/styles.css">
  
  <!-- Optional: Your custom styles to override MDWriter defaults -->
  <link rel="stylesheet" href="your-overrides.css">
</head>
<body>
  <div id="app">
    <!-- Toolbar -->
    <header class="toolbar">
      <div class="toolbar-section">
        <button id="toggle-sidebar" class="toolbar-btn" title="Toggle Sidebar">☰</button>
        <button id="new-doc" class="toolbar-btn" title="New Document">📄 New</button>
        <button id="open-doc" class="toolbar-btn" title="Open Document">📁 Open</button>
        <button id="save-doc" class="toolbar-btn" title="Save Document">💾 Save</button>
      </div>
      <div class="toolbar-section">
        <button id="validate-btn" class="toolbar-btn toolbar-btn-validate" title="Validate">
          <span class="validate-icon">✓</span> Validate
        </button>
      </div>
      <div class="toolbar-section">
        <button id="preview-fullscreen-btn" class="toolbar-btn" title="Preview">👁️ Preview</button>
      </div>
      <div class="toolbar-section">
        <button id="collab-btn" class="toolbar-btn" title="Collaboration">👥 Collaborate</button>
        <span id="collab-status" class="collab-status"></span>
      </div>
      <div class="toolbar-section toolbar-section-info">
        <span id="document-type">No Document</span>
        <span id="modified-indicator" class="modified-indicator" style="display: none;">●</span>
      </div>
      <div class="toolbar-section">
        <button id="toggle-properties" class="toolbar-btn" title="Toggle Properties">⋮</button>
      </div>
    </header>

    <!-- Main Container -->
    <div class="main-container">
      <!-- Sidebar -->
      <aside class="sidebar">
        <h3>Document Structure</h3>
        <div id="document-outline" class="outline">
          <p class="placeholder">No document loaded</p>
        </div>
        <div class="section-controls">
          <button id="add-section" class="btn-primary">+ Add Section</button>
        </div>
        <div class="resize-handle resize-handle-right"></div>
      </aside>

      <!-- Editor Area -->
      <main class="editor-container">
        <div id="editor" class="editor">
          <div class="welcome-screen">
            <h1>Welcome to MDWriter</h1>
            <p>A structured writing application for Module Descriptors</p>
            <div class="welcome-actions">
              <button id="create-new" class="btn-large">Create New Document</button>
              <button id="open-existing" class="btn-large">Open Existing Document</button>
            </div>
          </div>
        </div>
      </main>

      <!-- Properties Panel -->
      <aside class="properties-panel">
        <div class="resize-handle resize-handle-left"></div>
        <div class="panel-tabs">
          <button class="panel-tab active" data-tab="validation">Validation</button>
          <button class="panel-tab" data-tab="metadata">Document Info</button>
          <button class="panel-tab" data-tab="output">Output</button>
        </div>
        <div class="panel-content">
          <div id="validation-panel" class="tab-panel active">
            <div class="validation-summary" style="display: none;">
              <div class="validation-status valid">
                <span class="status-icon">✓</span>
                <span class="status-text">Document is valid</span>
              </div>
            </div>
            <div id="validation-errors" class="validation-errors"></div>
          </div>
          <div id="metadata-panel" class="tab-panel">
            <div class="metadata-section">
              <h4>Document</h4>
              <div class="metadata-item"><label>Type:</label><span id="meta-type">-</span></div>
              <div class="metadata-item"><label>Created:</label><span id="meta-created">-</span></div>
              <div class="metadata-item"><label>Modified:</label><span id="meta-modified">-</span></div>
            </div>
          </div>
          <div id="output-panel" class="tab-panel">
            <div class="output-controls">
              <h4>Template</h4>
              <select id="template-select" class="field-input">
                <option value="">No Template</option>
              </select>
            </div>
            <div class="output-preview">
              <h4>Document Preview</h4>
              <div id="document-preview" class="markdown-rendered">
                <p class="placeholder">No document loaded</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Status Bar -->
    <footer class="statusbar">
      <span id="status-text">Ready</span>
    </footer>
  </div>

  <!-- Fullscreen Preview Overlay -->
  <div id="fullscreen-preview-overlay" class="fullscreen-overlay" style="display: none;">
    <div class="fullscreen-header">
      <h2>Document Preview</h2>
      <button id="exit-fullscreen" class="btn-secondary">✕ Exit</button>
    </div>
    <div id="fullscreen-preview-content" class="fullscreen-content markdown-rendered"></div>
  </div>

  <!-- Scripts (ORDER MATTERS!) -->
  <script src="mdwriter/socket.io.min.js"></script>
  <script src="mdwriter/logger.js"></script>
  
  <!-- YOUR BACKEND - Must be registered before platform-api.js -->
  <script src="your-backend.js"></script>
  
  <!-- MDWriter Core -->
  <script src="mdwriter/platform-api.js"></script>
  <script src="mdwriter/collaboration-client.js"></script>
  <script src="mdwriter/collaboration-manager.js"></script>
  <script src="mdwriter/marked.min.js"></script>
  <script src="mdwriter/markdown-editor.js"></script>
  <script src="mdwriter/form-generator.js"></script>
  <script src="mdwriter/template-ui.js"></script>
  <script src="mdwriter/renderer.js"></script>
</body>
</html>
```

### Embedding in an Existing Page

If you want to embed MDWriter within an existing page (e.g., inside a specific container):

```html
<div id="mdwriter-container">
  <!-- Copy the MDWriter HTML structure here -->
</div>

<script>
  // Scope MDWriter to your container if needed
  document.addEventListener('DOMContentLoaded', () => {
    // MDWriter initializes automatically when renderer.js loads
  });
</script>
```

---

## Required Files

Copy these files from MDWriter's `src/renderer/` directory:

| File | Purpose |
|------|---------|
| `styles.css` | Core editor styles |
| `platform-api.js` | Backend abstraction layer |
| `renderer.js` | Main editor logic |
| `form-generator.js` | Dynamic form generation |
| `markdown-editor.js` | Markdown editing support |
| `template-ui.js` | Template rendering |
| `logger.js` | Logging utilities |
| `collaboration-client.js` | Collaboration support |
| `collaboration-manager.js` | Collaboration UI |
| `marked.min.js` | Markdown parser |
| `socket.io.min.js` | WebSocket client (for collaboration) |

### Directory Structure

```
your-project/
├── index.html
├── your-backend.js          # Your custom backend implementation
└── mdwriter/
    ├── styles.css
    ├── platform-api.js
    ├── renderer.js
    ├── form-generator.js
    ├── markdown-editor.js
    ├── template-ui.js
    ├── logger.js
    ├── collaboration-client.js
    ├── collaboration-manager.js
    ├── marked.min.js
    └── socket.io.min.js
```

---

## Backend Implementation

### Creating Your Custom Backend

Your backend must implement the `PlatformBackendInterface`. Here's a complete example:

```javascript
// your-backend.js

const MyBackend = {
  // Platform identification
  platform: 'my-platform',
  isElectron: false,
  isWeb: true,

  // ============================================================
  // DOCUMENT TYPE OPERATIONS
  // ============================================================

  /**
   * Get available document types
   * @returns {Promise<Array>} Array of document type objects
   */
  async getDocumentTypes() {
    // Return your available document types
    // Each type should have: name, description, category, icon
    const response = await fetch('/api/document-types');
    return response.json();
    
    // Or return static types:
    // return [
    //   { name: 'mdf', description: 'Module Descriptor', category: 'Academic', icon: '📋' },
    //   { name: 'prfaq', description: 'PR/FAQ', category: 'Product', icon: '📝' }
    // ];
  },

  /**
   * Get schema structure for a document type
   * @param {string} documentType - The document type name
   * @returns {Promise<Array>} Array of schema properties
   */
  async getSchemaStructure(documentType) {
    const response = await fetch(`/api/schemas/${documentType}/structure`);
    return response.json();
  },

  /**
   * Get custom form data for special field types
   * @param {string} documentType - The document type
   * @param {string} formName - The custom form name
   * @returns {Promise<Object>} Custom form configuration
   */
  async getCustomFormData(documentType, formName) {
    const response = await fetch(`/api/schemas/${documentType}/forms/${formName}`);
    return response.json();
  },

  // ============================================================
  // DOCUMENT OPERATIONS
  // ============================================================

  /**
   * Create a new document
   * @param {string} documentType - The type of document to create
   * @returns {Promise<Object>} { success: boolean, document?: Object }
   */
  async createNewDocument(documentType) {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentType })
    });
    const data = await response.json();
    return { success: true, document: data };
  },

  /**
   * Show open document dialog (web: file picker)
   * @returns {Promise<Object>} { success: boolean, filePath?: string, content?: string }
   */
  async openDocumentDialog() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.mdf,.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const content = await file.text();
          resolve({ success: true, filePath: file.name, content });
        } else {
          resolve({ success: false });
        }
      };
      input.click();
    });
  },

  /**
   * Load a document
   * @param {string|Object} filePathOrContent - File path, ID, or { content: string }
   * @returns {Promise<Object>} { success: boolean, document?: Object }
   */
  async loadDocument(filePathOrContent) {
    if (typeof filePathOrContent === 'object' && filePathOrContent.content) {
      // Parse content directly
      try {
        const document = JSON.parse(filePathOrContent.content);
        return { success: true, document };
      } catch (e) {
        return { success: false, error: 'Invalid JSON' };
      }
    }
    
    // Load from your API by ID
    const response = await fetch(`/api/documents/${filePathOrContent}`);
    const document = await response.json();
    return { success: true, document };
  },

  /**
   * Show save dialog
   * @param {boolean} isExport - Whether this is an export operation
   * @param {string} defaultPath - Default filename
   * @returns {Promise<Object>} { success: boolean, filePath?: string }
   */
  async saveDocumentDialog(isExport, defaultPath) {
    const ext = isExport ? 'json' : 'mdf';
    return { success: true, filePath: defaultPath || `document.${ext}` };
  },

  /**
   * Save document
   * @param {string} filePath - File path or document ID
   * @param {Object} document - The document to save
   * @returns {Promise<Object>} { success: boolean }
   */
  async saveDocument(filePath, document) {
    // Option 1: Save to your API
    await fetch('/api/documents/' + document.metadata.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document)
    });
    return { success: true };
    
    // Option 2: Download as file
    // const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = filePath;
    // a.click();
    // return { success: true };
  },

  /**
   * Export document (clean JSON without metadata)
   * @param {string} filePath - Export filename
   * @param {Object} document - The document to export
   * @returns {Promise<Object>} { success: boolean }
   */
  async exportDocument(filePath, document) {
    const blob = new Blob([JSON.stringify(document.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  },

  /**
   * Validate document against schema
   * @param {Object} document - Document to validate
   * @returns {Promise<Object>} { valid: boolean, errors?: Array }
   */
  async validateDocument(document) {
    const response = await fetch('/api/documents/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document)
    });
    return response.json();
  },

  /**
   * Show unsaved changes dialog
   * @returns {Promise<Object>} { choice: number } - 0=Save, 1=Don't Save, 2=Cancel
   */
  async showUnsavedChangesDialog() {
    const save = confirm('You have unsaved changes. Save them?');
    return { choice: save ? 0 : 1 };
  },

  // ============================================================
  // DOCUMENT EDITING
  // ============================================================

  /**
   * Update a field in the document
   * @param {Object} document - The document
   * @param {string} fieldPath - Dot-notation path (e.g., 'title' or 'metadata.author')
   * @param {any} value - New value
   * @returns {Promise<Object>} { success: boolean, document?: Object }
   */
  async updateField(document, fieldPath, value) {
    const parts = fieldPath.split('.');
    let current = document.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    document.metadata.modified = new Date().toISOString();
    
    return { success: true, document };
  },

  /**
   * Add item to an array field
   */
  async addArrayItem(document, arrayPath, item) {
    const parts = arrayPath.split('.');
    let current = document.data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    
    const arrayField = parts[parts.length - 1];
    if (!current[arrayField]) current[arrayField] = [];
    current[arrayField].push(item);
    
    document.metadata.modified = new Date().toISOString();
    return { success: true, document };
  },

  /**
   * Remove item from array field
   */
  async removeArrayItem(document, arrayPath, index) {
    const parts = arrayPath.split('.');
    let current = document.data;
    
    for (const part of parts.slice(0, -1)) {
      current = current[part];
    }
    
    const arrayField = parts[parts.length - 1];
    if (current[arrayField]) {
      current[arrayField].splice(index, 1);
    }
    
    document.metadata.modified = new Date().toISOString();
    return { success: true, document };
  },

  /**
   * Add comment to document
   */
  async addComment(document, comment, sectionPath) {
    if (!document.metadata.comments) document.metadata.comments = [];
    document.metadata.comments.push({
      id: crypto.randomUUID(),
      text: comment,
      sectionPath,
      timestamp: new Date().toISOString()
    });
    return { success: true, document };
  },

  // ============================================================
  // CONFIGURATION
  // ============================================================

  async configGet(key) {
    const value = localStorage.getItem(`myapp_${key}`);
    return { success: true, value: value ? JSON.parse(value) : null };
  },

  async configSet(key, value) {
    localStorage.setItem(`myapp_${key}`, JSON.stringify(value));
    return { success: true };
  },

  async configGetAll() {
    const config = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('myapp_')) {
        config[key.slice(6)] = JSON.parse(localStorage.getItem(key));
      }
    }
    return { success: true, config };
  },

  async configGetPreference(key, defaultValue) {
    const result = await this.configGet(`pref_${key}`);
    return { success: true, value: result.value ?? defaultValue };
  },

  async configSetPreference(key, value) {
    return this.configSet(`pref_${key}`, value);
  },

  async configAddRecentFile(filePath) {
    const result = await this.configGet('recentFiles');
    let files = result.value || [];
    files = [filePath, ...files.filter(f => f !== filePath)].slice(0, 10);
    return this.configSet('recentFiles', files);
  },

  async configGetRecentFiles() {
    const result = await this.configGet('recentFiles');
    return { success: true, files: result.value || [] };
  },

  async configGetUserspaceModelsDir() {
    return { success: true, path: null };
  },

  async configSetUserspaceModelsDir() {
    return { success: false, error: 'Not supported' };
  },

  // ============================================================
  // TEMPLATES
  // ============================================================

  async templatesLoad(documentType) {
    const response = await fetch(`/api/templates/${documentType}`);
    return response.json();
  },

  async templatesRender(templateId, documentData, documentType) {
    const response = await fetch('/api/templates/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, documentData, documentType })
    });
    return response.json();
  },

  async templatesCreate(documentType, name, content) {
    // Implement if you support user-created templates
    return { success: false, error: 'Not supported' };
  },

  async templatesSetActive(templateId) {
    return this.configSet('activeTemplate', templateId);
  },

  async templatesGetActive() {
    const result = await this.configGet('activeTemplate');
    return { success: true, templateId: result.value };
  },

  // ============================================================
  // IMPORT
  // ============================================================

  async importCleanJSON(filePath, existingDocument) {
    // Handle importing clean JSON into a document
    return { success: false, error: 'Not implemented' };
  },

  // ============================================================
  // MENU (Web: no-op)
  // ============================================================

  async updateMenuState(state) {
    return { success: true };
  },

  // ============================================================
  // COLLABORATION (Optional)
  // ============================================================

  async collabHostSession(document, metadata) {
    return { success: false, error: 'Collaboration not supported' };
  },

  async collabStopHosting() {
    return { success: true };
  },

  async collabStartDiscovery() {
    return { success: true };
  },

  async collabStopDiscovery() {
    return { success: true };
  },

  async collabGetDiscoveredSessions() {
    return { success: true, sessions: [] };
  },

  async collabGetCurrentSession() {
    return { success: true, session: null };
  },

  // ============================================================
  // EVENTS (Web: simplified)
  // ============================================================

  onEvent(event, callback) {
    // No-op for web
  },

  onMenuAction(action, callback) {
    // No-op for web
  },

  removeMenuListener(action, callback) {
    // No-op for web
  },

  sendLog(level, args) {
    console[level]?.(...args) || console.log(...args);
  }
};

// Register the backend BEFORE MDWriter loads
window.MDWriter = window.MDWriter || {};
window.MDWriter.registerBackend(MyBackend);
```

---

## Complete Integration Example

Here's a complete working example for a Learning Management System (LMS):

### `lms-editor.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Module Editor - My LMS</title>
  <link rel="stylesheet" href="mdwriter/styles.css">
  <style>
    /* Custom LMS styling */
    .toolbar { background: #2c3e50; }
    .sidebar { background: #34495e; }
    .lms-header {
      background: #1a252f;
      padding: 10px 20px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <!-- LMS Header -->
  <div class="lms-header">
    <span>My LMS - Module Editor</span>
    <button onclick="window.location.href='/dashboard'">Back to Dashboard</button>
  </div>

  <!-- MDWriter Editor -->
  <div id="app">
    <!-- ... (full HTML structure from above) ... -->
  </div>

  <!-- LMS Backend -->
  <script>
    const LMSBackend = {
      platform: 'my-lms',
      isElectron: false,
      isWeb: true,

      // Get document types from LMS API
      async getDocumentTypes() {
        const token = localStorage.getItem('lms_token');
        const response = await fetch('/lms-api/document-types', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
      },

      async getSchemaStructure(documentType) {
        const token = localStorage.getItem('lms_token');
        const response = await fetch(`/lms-api/schemas/${documentType}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.json();
      },

      // ... implement all other methods with your LMS API
      
      async saveDocument(filePath, document) {
        const token = localStorage.getItem('lms_token');
        const courseId = new URLSearchParams(window.location.search).get('courseId');
        
        await fetch(`/lms-api/courses/${courseId}/modules`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(document)
        });
        
        return { success: true };
      },

      // ... rest of implementation
    };

    window.MDWriter = window.MDWriter || {};
    window.MDWriter.registerBackend(LMSBackend);
  </script>

  <!-- MDWriter Scripts -->
  <script src="mdwriter/socket.io.min.js"></script>
  <script src="mdwriter/logger.js"></script>
  <script src="mdwriter/platform-api.js"></script>
  <script src="mdwriter/collaboration-client.js"></script>
  <script src="mdwriter/collaboration-manager.js"></script>
  <script src="mdwriter/marked.min.js"></script>
  <script src="mdwriter/markdown-editor.js"></script>
  <script src="mdwriter/form-generator.js"></script>
  <script src="mdwriter/template-ui.js"></script>
  <script src="mdwriter/renderer.js"></script>
</body>
</html>
```

---

## API Reference

### Document Structure

MDWriter documents have this structure:

```javascript
{
  metadata: {
    id: "uuid",
    documentType: "mdf",
    created: "2024-01-01T00:00:00.000Z",
    modified: "2024-01-02T00:00:00.000Z",
    version: 1,
    comments: []
  },
  data: {
    // Document content based on schema
    title: "Module Title",
    description: "...",
    // ...
  }
}
```

### Schema Structure

Document type schemas define the fields:

```javascript
[
  {
    name: "title",
    label: "Title",
    type: "string",
    required: true,
    description: "The module title"
  },
  {
    name: "description",
    label: "Description",
    type: "string",
    format: "textarea",
    description: "Module description"
  },
  // ...
]
```

### Validation Errors

```javascript
{
  valid: false,
  errors: [
    {
      path: "title",
      message: "Title is required",
      keyword: "required"
    }
  ]
}
```

---

## Styling and Customization

### Overriding Styles

Create a CSS file that loads after `styles.css`:

```css
/* my-overrides.css */

/* Change primary color */
.btn-primary {
  background-color: #your-brand-color;
}

/* Custom toolbar */
.toolbar {
  background: linear-gradient(to right, #2c3e50, #3498db);
}

/* Hide features you don't need */
#collab-btn {
  display: none;
}
```

### Disabling Features

To hide features you don't support:

```css
/* Hide collaboration */
#collab-btn, #collab-status { display: none; }

/* Hide template selector */
#template-select { display: none; }

/* Hide certain toolbar buttons */
#preview-fullscreen-btn { display: none; }
```

---

## Troubleshooting

### Common Issues

**1. "Backend not registered" error**

Ensure your backend is registered BEFORE `platform-api.js` loads:

```html
<script>
  window.MDWriter = window.MDWriter || {};
  window.MDWriter.registerBackend(myBackend);
</script>
<script src="platform-api.js"></script>  <!-- AFTER registration -->
```

**2. "Method not implemented" warnings**

Check the console for missing methods. Implement all required methods in your backend.

**3. Document not saving**

Verify your `saveDocument` method returns `{ success: true }`.

**4. Schema not loading**

Ensure `getSchemaStructure` returns the correct format (array of field definitions).

### Validating Your Backend

```javascript
// In browser console:
const validation = window.MDWriter.validateBackend(window.platformAPI);
console.log('Valid:', validation.valid);
console.log('Missing:', validation.missing);
```

### Debug Mode

Add logging to your backend:

```javascript
async saveDocument(filePath, document) {
  console.log('[MyBackend] Saving document:', { filePath, document });
  // ... your implementation
}
```

---

## Support

For more details, see:
- [Web Platform Architecture](./WEB-PLATFORM-ARCHITECTURE.md) - Technical architecture details
- [Schema-Driven Architecture](./SCHEMA-DRIVEN-ARCHITECTURE.md) - How schemas work
- [Document Types](./DOCUMENT-TYPES.md) - Adding new document types
