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
  collaborationStatus: document.getElementById('collaboration-status'),
  documentType: document.getElementById('document-type')
};

// Current document state
let currentDocument = null;
let currentFilePath = null;
let documentType = 'mdf';
let schemaProperties = [];
let formGenerator = null;
let isModified = false;

// Initialize form generator
if (typeof FormGenerator !== 'undefined') {
  formGenerator = new FormGenerator();
}

// Event handlers
elements.newDoc?.addEventListener('click', createNewDocument);
elements.createNew?.addEventListener('click', createNewDocument);
elements.openDoc?.addEventListener('click', openDocument);
elements.openExisting?.addEventListener('click', openDocument);
elements.saveDoc?.addEventListener('click', saveDocument);
elements.saveAsDoc?.addEventListener('click', saveDocumentAs);
elements.exportJson?.addEventListener('click', exportToJson);
elements.addSection?.addEventListener('click', addSection);

// Listen for form changes
document.addEventListener('input', (e) => {
  if (e.target.dataset.fieldPath) {
    handleFieldChange(e.target);
  }
});

// Listen for array item events
document.addEventListener('add-array-item', async (e) => {
  await handleAddArrayItem(e.detail.arrayPath, e.detail.property);
});

document.addEventListener('remove-array-item', async (e) => {
  await handleRemoveArrayItem(e.detail.arrayPath, e.detail.index);
});

// Listen for custom form changes
document.addEventListener('custom-form-change', async (e) => {
  await handleFieldChange({ dataset: { fieldPath: e.detail.fieldPath }, value: e.detail.value }, true);
});

async function showDocumentTypeDialog() {
  // Get available document types
  const documentTypes = await window.electronAPI.getDocumentTypes();
  
  if (documentTypes.length === 0) {
    alert('No document types available');
    return null;
  }
  
  // Get recently used types from localStorage
  const recentTypes = JSON.parse(localStorage.getItem('recentDocumentTypes') || '[]');
  
  // Group by category
  const categorized = {};
  const recentDocs = [];
  
  documentTypes.forEach(type => {
    const category = type.category || 'Other';
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(type);
    
    // Add to recent if in recent list
    if (recentTypes.includes(type.name)) {
      recentDocs.push(type);
    }
  });
  
  // Sort recent docs by recency
  recentDocs.sort((a, b) => recentTypes.indexOf(a.name) - recentTypes.indexOf(b.name));
  
  // Create modal dialog
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog document-type-dialog">
      <div class="modal-header">
        <h2>Create New Document</h2>
        <button class="modal-close" data-action="close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="search-box">
          <input type="text" id="doc-type-search" placeholder="Search document types..." autocomplete="off">
          <span class="search-icon">🔍</span>
        </div>
        <div class="document-type-list-view">
          ${recentDocs.length > 0 ? `
            <div class="type-category" data-category="recent">
              <div class="category-header">
                <span class="category-toggle">▼</span>
                <span class="category-name">Recently Used</span>
              </div>
              <div class="category-items">
                ${recentDocs.map(type => createTypeListItem(type)).join('')}
              </div>
            </div>
          ` : ''}
          ${Object.keys(categorized).sort().map(category => `
            <div class="type-category" data-category="${category}">
              <div class="category-header">
                <span class="category-toggle">▼</span>
                <span class="category-name">${category}</span>
              </div>
              <div class="category-items">
                ${categorized[category].map(type => createTypeListItem(type)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" data-action="close">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus search input
  const searchInput = modal.querySelector('#doc-type-search');
  searchInput.focus();
  
  // Setup search functionality
  setupDocumentTypeSearch(modal, documentTypes);
  
  // Setup category toggle
  modal.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', (e) => {
      const category = e.currentTarget.closest('.type-category');
      category.classList.toggle('collapsed');
      const toggle = category.querySelector('.category-toggle');
      toggle.textContent = category.classList.contains('collapsed') ? '▶' : '▼';
    });
  });
  
  // Return promise that resolves when user selects a type
  return new Promise((resolve) => {
    modal.querySelectorAll('.type-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const selectedType = item.dataset.type;
        
        // Save to recent types
        saveRecentDocumentType(selectedType);
        
        modal.remove();
        resolve(selectedType);
      });
    });
    
    // Close handlers
    modal.querySelectorAll('[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.remove();
        resolve(null);
      });
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstVisible = modal.querySelector('.type-list-item:not(.hidden)');
        if (firstVisible) {
          firstVisible.click();
        }
      } else if (e.key === 'Escape') {
        modal.remove();
        resolve(null);
      }
    });
  });
}

function createTypeListItem(type) {
  const icon = type.icon || '📝';
  const extensions = type.extensions.join(', ');
  return `
    <div class="type-list-item" data-type="${type.name}" data-search="${type.name} ${type.description} ${extensions}">
      <span class="type-icon">${icon}</span>
      <div class="type-info">
        <div class="type-title">${type.description || type.name}</div>
        <div class="type-meta">${extensions}</div>
      </div>
    </div>
  `;
}

function setupDocumentTypeSearch(modal, documentTypes) {
  const searchInput = modal.querySelector('#doc-type-search');
  const items = modal.querySelectorAll('.type-list-item');
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      // Show all items
      items.forEach(item => item.classList.remove('hidden'));
      modal.querySelectorAll('.type-category').forEach(cat => cat.classList.remove('hidden'));
      return;
    }
    
    // Filter items
    let hasVisibleItems = {};
    items.forEach(item => {
      const searchText = item.dataset.search.toLowerCase();
      const matches = searchText.includes(query);
      item.classList.toggle('hidden', !matches);
      
      // Track which categories have visible items
      const category = item.closest('.type-category').dataset.category;
      if (matches) {
        hasVisibleItems[category] = true;
      }
    });
    
    // Hide empty categories
    modal.querySelectorAll('.type-category').forEach(cat => {
      const category = cat.dataset.category;
      cat.classList.toggle('hidden', !hasVisibleItems[category]);
    });
  });
}

function saveRecentDocumentType(typeName) {
  let recent = JSON.parse(localStorage.getItem('recentDocumentTypes') || '[]');
  
  // Remove if already exists
  recent = recent.filter(t => t !== typeName);
  
  // Add to front
  recent.unshift(typeName);
  
  // Keep only last 5
  recent = recent.slice(0, 5);
  
  localStorage.setItem('recentDocumentTypes', JSON.stringify(recent));
}

function getDocumentTypeIcon(typeName) {
  const icons = {
    'mdf': '📘',
    'prfaq': '📄',
    'default': '📝'
  };
  return icons[typeName] || icons.default;
}

async function createNewDocument() {
  updateStatus('Select document type...');
  
  try {
    // Show document type selection dialog
    const selectedType = await showDocumentTypeDialog();
    
    if (!selectedType) {
      updateStatus('Cancelled');
      return;
    }
    
    documentType = selectedType;
    updateStatus('Creating new document...');
    
    const result = await window.electronAPI.createNewDocument(documentType);
    
    if (result.success) {
      currentDocument = result.document;
      currentFilePath = null;
      isModified = false;
      
      // Load schema structure
      const structure = await window.electronAPI.getSchemaStructure(documentType);
      schemaProperties = structure;
      
      // Render document
      await renderDocument();
      updateStatus('New document created');
    } else {
      updateStatus('Error: ' + result.error);
    }
  } catch (err) {
    updateStatus('Error creating document: ' + err.message);
  }
}

async function openDocument() {
  updateStatus('Opening document...');
  showLoadingIndicator('Loading document...');
  
  try {
    console.log('[Open] Showing file dialog...');
    const dialogResult = await window.electronAPI.openDocumentDialog();
    
    if (dialogResult.success) {
      console.log('[Open] Loading document:', dialogResult.filePath);
      updateStatus('Loading file...');
      const result = await window.electronAPI.loadDocument(dialogResult.filePath);
      
      if (result.success) {
        console.log('[Open] Document loaded, setting state...');
        currentDocument = result.document;
        currentFilePath = result.document.filePath;
        documentType = result.document.metadata.documentType;
        isModified = false;
        
        console.log('[Open] Loading schema structure...');
        // Load schema structure
        const structure = await window.electronAPI.getSchemaStructure(documentType);
        schemaProperties = structure;
        console.log('[Open] Schema loaded, properties count:', schemaProperties.length);
        
        // Render document (now awaited since it's async)
        console.log('[Open] Rendering document...');
        await renderDocument();
        console.log('[Open] Document rendered');
        
        hideLoadingIndicator();
        
        // Show validation results
        if (result.validation && !result.validation.valid) {
          updateStatus(`Document loaded with ${result.validation.errors.length} validation errors`);
        } else {
          updateStatus('Document loaded successfully');
        }
      } else {
        hideLoadingIndicator();
        updateStatus('Error loading: ' + result.error);
      }
    }
  } catch (err) {
    console.error('[Open] Error:', err);
    hideLoadingIndicator();
    updateStatus('Error opening document: ' + err.message);
  }
}

async function saveDocument() {
  if (!currentDocument) {
    updateStatus('No document to save');
    return false;
  }

  if (!currentFilePath) {
    return saveDocumentAs();
  }
  
  updateStatus('Saving document...');
  showLoadingIndicator('Saving document...');
  
  try {
    // Validate before saving
    const validation = await window.electronAPI.validateDocument(currentDocument);
    
    if (!validation.valid) {
      hideLoadingIndicator();
      const proceed = confirm(`Document has ${validation.errors.length} validation errors. Save anyway?`);
      if (!proceed) {
        updateStatus('Save cancelled');
        return false;
      }
      showLoadingIndicator('Saving document...');
    }
    
    const result = await window.electronAPI.saveDocument(currentFilePath, currentDocument);
    
    hideLoadingIndicator();
    
    if (result.success) {
      isModified = false;
      updateStatus('Document saved successfully');
      return true;
    } else {
      updateStatus('Error saving: ' + result.error);
      return false;
    }
  } catch (err) {
    hideLoadingIndicator();
    updateStatus('Error saving document: ' + err.message);
    return false;
  }
}

async function saveDocumentAs() {
  if (!currentDocument) {
    updateStatus('No document to save');
    return;
  }
  
  updateStatus('Save as...');
  
  try {
    const dialogResult = await window.electronAPI.saveDocumentDialog(false);
    
    if (dialogResult.success) {
      // Validate before saving
      const validation = await window.electronAPI.validateDocument(currentDocument);
      
      if (!validation.valid) {
        const proceed = confirm(`Document has ${validation.errors.length} validation errors. Save anyway?`);
        if (!proceed) {
          updateStatus('Save cancelled');
          return;
        }
      }
      
      const result = await window.electronAPI.saveDocument(dialogResult.filePath, currentDocument);
      
      if (result.success) {
        currentFilePath = dialogResult.filePath;
        isModified = false;
        updateStatus('Document saved successfully');
      } else {
        updateStatus('Error saving: ' + result.error);
      }
    }
  } catch (err) {
    updateStatus('Error saving document: ' + err.message);
  }
}

async function exportToJson() {
  if (!currentDocument) {
    updateStatus('No document to export');
    return;
  }
  
  updateStatus('Exporting to JSON...');
  
  try {
    // Generate default export filename based on current file path
    let defaultPath = null;
    if (currentFilePath) {
      // Replace extension with .json
      defaultPath = currentFilePath.replace(/\.[^.]+$/, '.json');
    }
    
    const dialogResult = await window.electronAPI.saveDocumentDialog(true, defaultPath);
    
    if (dialogResult.success) {
      const result = await window.electronAPI.exportDocument(dialogResult.filePath, currentDocument);
      
      if (result.success) {
        updateStatus('Exported successfully');
      } else {
        updateStatus('Error exporting: ' + result.error);
      }
    }
  } catch (err) {
    updateStatus('Error exporting document: ' + err.message);
  }
}

function addSection() {
  updateStatus('Add section feature coming soon...');
  // TODO: Show dialog with available sections based on schema
}

async function renderDocument() {
  console.log('[Renderer] Starting renderDocument...');
  if (!currentDocument || !schemaProperties) {
    console.log('[Renderer] Missing document or schema properties');
    return;
  }

  console.log('[Renderer] Document type:', currentDocument.metadata.documentType);
  console.log('[Renderer] Schema properties count:', schemaProperties.length);

  // Update document type display
  if (elements.documentType) {
    elements.documentType.textContent = `Document Type: ${currentDocument.metadata.documentType}`;
  }

  // Set document type in form generator
  if (formGenerator) {
    formGenerator.setDocumentType(currentDocument.metadata.documentType);
    
    console.log('[Renderer] Generating form...');
    // Generate form (async to handle custom forms)
    const form = await formGenerator.generateForm(schemaProperties, currentDocument.data);
    console.log('[Renderer] Form generated successfully');
    
    elements.editor.innerHTML = '';
    
    // Add title
    const titleHeader = document.createElement('h1');
    titleHeader.className = 'document-title';
    titleHeader.textContent = currentDocument.data.title || 'Untitled Document';
    elements.editor.appendChild(titleHeader);
    
    elements.editor.appendChild(form);
  }

  // Update outline and metadata
  console.log('[Renderer] Updating outline and metadata...');
  renderOutline();
  updateDocumentMetadata();
  
  // Run initial validation
  console.log('[Renderer] Running validation...');
  await validateAndDisplayErrors();
  console.log('[Renderer] renderDocument complete');
}

async function validateAndDisplayErrors() {
  const summary = document.querySelector('.validation-summary');
  const errorsContainer = document.getElementById('validation-errors');
  
  if (!currentDocument) {
    // Hide validation panel when no document loaded
    if (summary) summary.style.display = 'none';
    if (errorsContainer) errorsContainer.innerHTML = '';
    return;
  }
  
  // Show validation panel
  if (summary) summary.style.display = 'block';
  
  try {
    const validation = await window.electronAPI.validateDocument(currentDocument);
    
    const summary = document.querySelector('.validation-summary');
    const statusDiv = document.querySelector('.validation-status');
    const errorsContainer = document.getElementById('validation-errors');
    
    if (validation.valid) {
      summary.classList.remove('has-errors');
      statusDiv.className = 'validation-status valid';
      statusDiv.innerHTML = '<span class="status-icon">✓</span><span class="status-text">Document is valid</span>';
      errorsContainer.innerHTML = '';
      
      // Clear error highlights
      document.querySelectorAll('.field-error').forEach(el => {
        el.classList.remove('field-error');
        el.removeAttribute('title');
      });
    } else {
      summary.classList.add('has-errors');
      statusDiv.className = 'validation-status invalid';
      statusDiv.innerHTML = `<span class="status-icon">✗</span><span class="status-text">${validation.errors.length} validation error${validation.errors.length !== 1 ? 's' : ''}</span>`;
      
      // Display errors
      errorsContainer.innerHTML = validation.errors.map(error => {
        const path = error.instancePath || error.dataPath || '(root)';
        const keyword = error.keyword || 'error';
        let message = error.message || 'Validation failed';
        
        // Enhance error messages
        if (keyword === 'required') {
          const missingProp = error.params?.missingProperty || 'field';
          message = `Required field "${missingProp}" is missing`;
        } else if (keyword === 'type') {
          message = `Should be ${error.params?.type}`;
        } else if (keyword === 'enum') {
          message = `Must be one of: ${error.params?.allowedValues?.join(', ')}`;
        }
        
        return `
          <div class="validation-error error">
            <div class="validation-error-path">${path}</div>
            <div class="validation-error-message">
              <span class="validation-error-keyword">${keyword}</span>
              ${message}
            </div>
          </div>
        `;
      }).join('');
      
      // Highlight fields with errors
      highlightErrorFields(validation.errors);
    }
  } catch (err) {
    console.error('Error validating document:', err);
  }
}

function highlightErrorFields(errors) {
  // Clear existing error highlights
  document.querySelectorAll('.field-error').forEach(el => {
    el.classList.remove('field-error');
    el.removeAttribute('title');
  });
  
  // Add error highlights
  errors.forEach(error => {
    const path = error.instancePath || error.dataPath;
    if (!path) return;
    
    // Convert JSON path to field path (remove leading slash, replace / with .)
    const fieldPath = path.replace(/^\//, '').replace(/\//g, '.');
    
    // Find input with matching data-field-path
    const inputs = document.querySelectorAll(`[data-field-path="${fieldPath}"]`);
    inputs.forEach(input => {
      input.classList.add('field-error');
      input.title = error.message || 'Validation error';
    });
  });
}

function updateDocumentMetadata() {
  if (!currentDocument) return;
  
  const metadata = currentDocument.metadata || {};
  
  const metaType = document.getElementById('meta-type');
  const metaCreated = document.getElementById('meta-created');
  const metaModified = document.getElementById('meta-modified');
  const metaVersion = document.getElementById('meta-version');
  
  if (metaType) metaType.textContent = metadata.documentType || 'Unknown';
  if (metaCreated) metaCreated.textContent = metadata.createdAt 
    ? new Date(metadata.createdAt).toLocaleString() 
    : '-';
  if (metaModified) metaModified.textContent = metadata.lastModified 
    ? new Date(metadata.lastModified).toLocaleString() 
    : '-';
  if (metaVersion) metaVersion.textContent = metadata.version || '1.0';
}

function renderOutline() {
  if (!currentDocument) {
    return;
  }

  elements.outline.innerHTML = '';
  
  const tree = document.createElement('div');
  tree.className = 'outline-tree';
  
  // Add document title
  const titleItem = document.createElement('div');
  titleItem.className = 'outline-item';
  titleItem.textContent = currentDocument.data.title || 'Untitled';
  tree.appendChild(titleItem);
  
  // Add sections
  schemaProperties.forEach(prop => {
    if (currentDocument.data[prop.name]) {
      const item = document.createElement('div');
      item.className = 'outline-item outline-section';
      // Use displayAs if available, otherwise fall back to title or name
      item.textContent = prop.displayAs || prop.title || prop.name;
      item.dataset.field = prop.name;
      item.onclick = () => scrollToField(prop.name);
      tree.appendChild(item);
    }
  });
  
  elements.outline.appendChild(tree);
}

function scrollToField(fieldName) {
  const field = document.querySelector(`[data-field-path="${fieldName}"]`);
  if (field) {
    field.scrollIntoView({ behavior: 'smooth', block: 'start' });
    field.classList.add('highlight');
    setTimeout(() => field.classList.remove('highlight'), 2000);
  }
}

async function handleFieldChange(input, isCustomForm = false) {
  if (!currentDocument) return;
  
  const fieldPath = input.dataset.fieldPath;
  let value;
  
  if (isCustomForm) {
    // Value already provided for custom forms
    value = input.value;
  } else if (input.type === 'checkbox') {
    value = input.checked;
  } else if (input.type === 'number') {
    value = parseFloat(input.value);
  } else {
    value = input.value;
  }
  
  try {
    const result = await window.electronAPI.updateField(currentDocument, fieldPath, value);
    
    if (result.success) {
      currentDocument = result.document;
      isModified = true;
      renderOutline();
      
      // Validate after change (debounced)
      clearTimeout(window.validationTimeout);
      window.validationTimeout = setTimeout(() => validateAndDisplayErrors(), 500);
    }
  } catch (err) {
    console.error('Error updating field:', err);
  }
}

async function handleAddArrayItem(arrayPath, property) {
  if (!currentDocument) return;
  
  // Create empty item based on type
  let newItem;
  if (property.$ref) {
    newItem = {}; // Empty object for complex types
  } else if (property.items?.type === 'string') {
    newItem = '';
  } else {
    newItem = {};
  }
  
  try {
    const result = await window.electronAPI.addArrayItem(currentDocument, arrayPath, newItem);
    
    if (result.success) {
      currentDocument = result.document;
      isModified = true;
      await renderDocument();
    }
  } catch (err) {
    console.error('Error adding array item:', err);
  }
}

async function handleRemoveArrayItem(arrayPath, index) {
  if (!currentDocument) return;
  
  try {
    const result = await window.electronAPI.removeArrayItem(currentDocument, arrayPath, index);
    
    if (result.success) {
      currentDocument = result.document;
      isModified = true;
      await renderDocument();
    }
  } catch (err) {
    console.error('Error removing array item:', err);
  }
}

function updateStatus(message) {
  if (elements.statusText) {
    elements.statusText.textContent = message;
  }
  console.log('Status:', message);
}

function showLoadingIndicator(message = 'Loading...') {
  let indicator = document.getElementById('loading-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.className = 'loading-indicator';
    indicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-message">${message}</div>
    `;
    document.body.appendChild(indicator);
  } else {
    indicator.querySelector('.loading-message').textContent = message;
    indicator.style.display = 'flex';
  }
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

// Warn before closing with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (isModified) {
    e.returnValue = true;
    return true;
  }
});

// Panel tab switching
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    const tabName = e.target.dataset.tab;
    
    // Update active tab
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    
    // Update active panel
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`${tabName}-panel`).classList.add('active');
  });
});

// Expose functions and state for main process to call
window.saveDocument = saveDocument;
Object.defineProperty(window, 'isModified', {
  get: () => isModified
});

// Initialize
updateStatus('Ready');
