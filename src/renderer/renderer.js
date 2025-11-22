// Renderer process JavaScript
console.log('MDWriter renderer loaded');

// Check if electronAPI is available
if (window.electronAPI) {
  console.log('Electron API is available');
  console.log('Platform:', window.electronAPI.platform);
}

// UI element references
const elements = {
  newDoc: document.getElementById('new-doc'),
  openDoc: document.getElementById('open-doc'),
  saveDoc: document.getElementById('save-doc'),
  saveAsDoc: document.getElementById('save-as-doc'),
  exportJson: document.getElementById('export-json'),
  addSection: document.getElementById('add-section'),
  createNew: document.getElementById('create-new'),
  openExisting: document.getElementById('open-existing'),
  editor: document.getElementById('editor'),
  outline: document.getElementById('document-outline'),
  properties: document.getElementById('properties'),
  statusText: document.getElementById('status-text'),
  collaborationStatus: document.getElementById('collaboration-status')
};

// Current document state
let currentDocument = null;
let documentType = 'mdf';

// Event handlers
elements.newDoc?.addEventListener('click', createNewDocument);
elements.createNew?.addEventListener('click', createNewDocument);
elements.openDoc?.addEventListener('click', openDocument);
elements.openExisting?.addEventListener('click', openDocument);
elements.saveDoc?.addEventListener('click', saveDocument);
elements.saveAsDoc?.addEventListener('click', saveDocumentAs);
elements.exportJson?.addEventListener('click', exportToJson);
elements.addSection?.addEventListener('click', addSection);

function createNewDocument() {
  updateStatus('Creating new document...');
  
  // Show basic editor structure
  elements.editor.innerHTML = `
    <div class="document-editor">
      <h1 contenteditable="true" class="doc-title" placeholder="Document Title">Untitled Module Descriptor</h1>
      <div class="doc-content">
        <div class="section-placeholder">
          <p>Click "Add Section" to start building your module descriptor</p>
        </div>
      </div>
    </div>
  `;
  
  // Update outline
  elements.outline.innerHTML = `
    <div class="outline-item">Module Descriptor</div>
  `;
  
  updateStatus('Ready');
}

async function openDocument() {
  updateStatus('Opening document...');
  // TODO: Implement file dialog and document loading
  updateStatus('Document loading not yet implemented');
}

async function saveDocument() {
  if (!currentDocument) {
    return saveDocumentAs();
  }
  updateStatus('Saving document...');
  // TODO: Implement document saving
  updateStatus('Document saving not yet implemented');
}

async function saveDocumentAs() {
  updateStatus('Save as...');
  // TODO: Implement file dialog and document saving
  updateStatus('Save as not yet implemented');
}

async function exportToJson() {
  updateStatus('Exporting to JSON...');
  // TODO: Implement JSON export
  updateStatus('JSON export not yet implemented');
}

function addSection() {
  updateStatus('Add section...');
  // TODO: Implement section addition based on schema
  updateStatus('Section addition not yet implemented');
}

function updateStatus(message) {
  if (elements.statusText) {
    elements.statusText.textContent = message;
  }
  console.log('Status:', message);
}

// Initialize
updateStatus('Ready');
