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
  validateBtn: document.getElementById('validate-btn'),
  previewFullscreenBtn: document.getElementById('preview-fullscreen-btn'),
  addSection: document.getElementById('add-section'),
  createNew: document.getElementById('create-new'),
  openExisting: document.getElementById('open-existing'),
  editor: document.getElementById('editor'),
  outline: document.getElementById('document-outline'),
  properties: document.getElementById('properties'),
  statusText: document.getElementById('status-text'),
  collaborationStatus: document.getElementById('collaboration-status'),
  documentType: document.getElementById('document-type'),
  modifiedIndicator: document.getElementById('modified-indicator')
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
elements.validateBtn?.addEventListener('click', async () => {
  if (currentDocument) {
    await validateAndDisplayErrors();
    updateStatus('Validation complete');
  }
});
elements.previewFullscreenBtn?.addEventListener('click', () => {
  // Switch to output panel first
  document.querySelector('[data-tab="output"]')?.click();
  // Then toggle fullscreen
  setTimeout(() => togglePreviewFullscreen(), 100);
});
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
        <div class="create-from-file">
          <button id="create-from-file" class="btn-primary">Create from Existing Data File</button>
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
  
  // Add event listener for "Create from Existing Data File"
  modal.querySelector('#create-from-file')?.addEventListener('click', async () => {
    try {
      showLoadingIndicator('Importing data file...');
      
      const dialogResult = await window.electronAPI.openDocumentDialog();
      if (!dialogResult.success) {
        hideLoadingIndicator();
        updateStatus('Create from file canceled');
        return;
      }

      const filePath = dialogResult.filePath;
      updateStatus('Importing and validating data...');
      
      const result = await window.electronAPI.importCleanJSON(filePath);

      if (result.success) {
        currentDocument = result.document;
        currentFilePath = null; // Reset file path for new documents
        documentType = result.document.metadata.documentType;
        setModified(true);
        
        // Load schema structure for the new document type
        const structure = await window.electronAPI.getSchemaStructure(documentType);
        schemaProperties = structure;
        
        // Close the modal first
        modal.remove();
        
        // Render the document
        await renderDocument();
        
        hideLoadingIndicator();
        updateStatus('Document created from existing data file');
      } else {
        hideLoadingIndicator();
        updateStatus('Error creating document: ' + result.error);
        alert('Error creating document: ' + result.error);
      }
    } catch (err) {
      hideLoadingIndicator();
      updateStatus('Error: ' + err.message);
      alert('Error: ' + err.message);
    }
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
      setModified(false);
      
      // Load schema structure
      const structure = await window.electronAPI.getSchemaStructure(documentType);
      schemaProperties = structure;
      
      // Render document
      await renderDocument();
      updateStatus('New document created');
      updateMenuState();
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
        setModified(false);
        
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
        updateMenuState();
      } else {
        hideLoadingIndicator();
        updateStatus('Error loading: ' + result.error);
      }
    } else {
      // User canceled the dialog
      hideLoadingIndicator();
      updateStatus('Open canceled');
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
      setModified(false);
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
        setModified(false);
        updateStatus('Document saved successfully');
      } else {
        updateStatus('Error saving: ' + result.error);
      }
    }
  } catch (err) {
    updateStatus('Error saving document: ' + err.message);
  }
}

async function closeDocument() {
  // Check for unsaved changes
  if (isModified) {
    const choice = confirm('You have unsaved changes. Do you want to save before closing?');
    if (choice) {
      const saved = await saveDocument();
      if (!saved) {
        // User canceled save or save failed
        return;
      }
    }
  }
  
  // Reset document state
  currentDocument = null;
  currentFilePath = null;
  documentType = 'mdf';
  schemaProperties = [];
  setModified(false);
  
  // Reset UI to welcome screen
  elements.editor.innerHTML = `
    <div class="welcome-screen">
      <h1>Welcome to MDWriter</h1>
      <p>A structured writing application for Module Descriptors</p>
      <div class="welcome-actions">
        <button id="create-new" class="btn-large">Create New Document</button>
        <button id="open-existing" class="btn-large">Open Existing Document</button>
      </div>
    </div>
  `;
  
  // Re-attach event listeners for welcome screen buttons
  document.getElementById('create-new')?.addEventListener('click', createNewDocument);
  document.getElementById('open-existing')?.addEventListener('click', openDocument);
  
  // Clear outline
  elements.outline.innerHTML = '<p class="placeholder">No document loaded</p>';
  
  // Clear preview
  const previewContainer = document.getElementById('document-preview');
  if (previewContainer) {
    previewContainer.innerHTML = '<p class="placeholder">No document loaded</p>';
  }
  
  // Update document type display
  if (elements.documentType) {
    elements.documentType.textContent = 'No Document';
  }
  
  // Hide validation panel
  const validationSummary = document.querySelector('.validation-summary');
  if (validationSummary) {
    validationSummary.style.display = 'none';
  }
  
  // Clear validation errors
  const errorsContainer = document.getElementById('validation-errors');
  if (errorsContainer) {
    errorsContainer.innerHTML = '';
  }
  
  updateStatus('Document closed');
  updateMenuState();
}

function setModified(modified) {
  isModified = modified;
  
  // Update modified indicator visibility
  if (elements.modifiedIndicator) {
    elements.modifiedIndicator.style.display = modified ? 'inline' : 'none';
  }
  
  // Update window title if we have access
  const titlePrefix = isModified ? '● ' : '';
  const fileName = currentFilePath ? currentFilePath.split(/[/\\]/).pop() : 'Untitled';
  document.title = `${titlePrefix}${fileName} - MDWriter`;
  
  // Update menu state
  updateMenuState();
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
  
  // Initialize template UI and load templates
  if (!window.templateUI) {
    window.templateUI = initializeTemplateUI();
  }
  await window.templateUI.loadTemplates(currentDocument.metadata.documentType);
  
  // Update preview
  await renderDocumentPreview();
  
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
  
  // Add sections - show all properties from schema, not just populated ones
  schemaProperties.forEach(prop => {
    const item = document.createElement('div');
    item.className = 'outline-item outline-section';
    // Use displayAs if available, otherwise fall back to title or name
    item.textContent = prop.displayAs || prop.title || prop.name;
    item.dataset.field = prop.name;
    item.onclick = () => scrollToField(prop.name);
    
    // Add visual indicator if field is empty
    if (!currentDocument.data[prop.name]) {
      item.classList.add('outline-empty');
    }
    
    tree.appendChild(item);
  });
  
  elements.outline.appendChild(tree);
}

function scrollToField(fieldName) {
  const field = document.querySelector(`[data-field-path="${fieldName}"]`);
  if (field) {
    field.scrollIntoView({ behavior: 'smooth', block: 'start' });
    field.classList.add('highlight');
    setTimeout(() => field.classList.remove('highlight'), 2000);
    
    // Send cursor update when navigating via outline
    if (typeof window.sendCursorUpdate === 'function') {
      window.sendCursorUpdate(fieldName);
    }
    
    // Focus the field if it's an input
    if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA' || field.tagName === 'SELECT') {
      field.focus();
    }
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
      setModified(true);
      renderOutline();
      
      // Send to collaboration session if connected
      if (window.collaborationClient && window.collaborationClient.isConnected()) {
        window.collaborationClient.sendUpdate({
          type: 'set',
          path: fieldPath,
          value: value
        });
      }
      
      // Validate after change (debounced)
      clearTimeout(window.validationTimeout);
      window.validationTimeout = setTimeout(() => validateAndDisplayErrors(), 500);
      
      // Update preview after change (debounced)
      clearTimeout(window.previewUpdateTimeout);
      window.previewUpdateTimeout = setTimeout(() => renderDocumentPreview(), 500);
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
      
      // Send to collaboration session if connected
      if (window.collaborationClient && window.collaborationClient.isConnected()) {
        const arr = getValueAtPath(currentDocument, arrayPath);
        const index = arr.length - 1;
        window.collaborationClient.sendUpdate({
          type: 'array-insert',
          path: arrayPath,
          value: newItem,
          index: index
        });
      }
      
      await renderDocument();
      
      // Update preview immediately for array changes
      await renderDocumentPreview();
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
      
      // Send to collaboration session if connected
      if (window.collaborationClient && window.collaborationClient.isConnected()) {
        window.collaborationClient.sendUpdate({
          type: 'array-remove',
          path: arrayPath,
          index: index
        });
      }
      
      await renderDocument();
      
      // Update preview immediately for array changes
      await renderDocumentPreview();
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
    
    // If switching to output tab, render preview
    if (tabName === 'output') {
      renderDocumentPreview();
    }
  });
});

// Output panel controls
document.getElementById('reset-render-order')?.addEventListener('click', resetRenderOrder);
document.getElementById('export-preview')?.addEventListener('click', exportPreviewHTML);
document.getElementById('preview-fullscreen')?.addEventListener('click', togglePreviewFullscreen);

// Fullscreen preview functions
function togglePreviewFullscreen() {
  const overlay = document.getElementById('fullscreen-preview-overlay');
  const content = document.getElementById('fullscreen-preview-content');
  const preview = document.getElementById('document-preview');
  const exitBtn = document.getElementById('exit-fullscreen');
  const exportBtn = document.getElementById('export-fullscreen');
  
  if (!overlay || !content || !preview) return;
  
  // Attach button listeners if not already attached
  if (exitBtn && !exitBtn.hasAttribute('data-listener-attached')) {
    exitBtn.addEventListener('click', exitPreviewFullscreen);
    exitBtn.setAttribute('data-listener-attached', 'true');
  }
  
  if (exportBtn && !exportBtn.hasAttribute('data-listener-attached')) {
    exportBtn.addEventListener('click', exportPreviewHTML);
    exportBtn.setAttribute('data-listener-attached', 'true');
  }
  
  // Copy preview content to fullscreen overlay
  content.innerHTML = preview.innerHTML;
  
  // Show overlay
  overlay.style.display = 'flex';
}

function exitPreviewFullscreen() {
  const overlay = document.getElementById('fullscreen-preview-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// ESC key to exit fullscreen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('fullscreen-preview-overlay');
    if (overlay && overlay.style.display !== 'none') {
      exitPreviewFullscreen();
    }
  }
});

function getRenderOrder() {
  // Get render order from document metadata, or fall back to fieldOrder
  if (currentDocument?.metadata?.renderOrder && Array.isArray(currentDocument.metadata.renderOrder)) {
    return currentDocument.metadata.renderOrder;
  }
  
  // Get document type metadata
  const docTypeMeta = schemaProperties; // Already has ordered properties
  if (!docTypeMeta) return [];
  
  return docTypeMeta.map(p => p.name);
}

function updateRenderOrderList() {
  const container = document.getElementById('render-order-list');
  if (!container || !schemaProperties) return;
  
  const renderOrder = getRenderOrder();
  const hiddenFields = currentDocument?.metadata?.hiddenFields || [];
  
  container.innerHTML = renderOrder.map(fieldName => {
    const prop = schemaProperties.find(p => p.name === fieldName);
    const displayName = prop?.displayAs || prop?.title || fieldName;
    const isHidden = hiddenFields.includes(fieldName);
    
    return `
      <div class="render-order-item ${isHidden ? 'hidden-field' : ''}" draggable="true" data-field="${fieldName}">
        <span class="drag-handle">☰</span>
        <span class="field-name">${displayName}</span>
        <span class="field-key">${fieldName}</span>
        <button type="button" class="toggle-visibility" data-field="${fieldName}" title="${isHidden ? 'Show in preview' : 'Hide from preview'}">
          ${isHidden ? '👁️' : '🚫'}
        </button>
      </div>
    `;
  }).join('');
  
  // Setup drag and drop
  setupRenderOrderDragDrop();
  
  // Setup visibility toggles
  container.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFieldVisibility(btn.dataset.field);
    });
  });
}

function setupRenderOrderDragDrop() {
  const container = document.getElementById('render-order-list');
  if (!container) return;
  
  let draggedItem = null;
  
  container.querySelectorAll('.render-order-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      draggedItem = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      if (afterElement == null) {
        container.appendChild(draggedItem);
      } else {
        container.insertBefore(draggedItem, afterElement);
      }
    });
  });
  
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    saveRenderOrder();
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.render-order-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function toggleFieldVisibility(fieldName) {
  if (!currentDocument) return;
  
  // Initialize hiddenFields if not exists
  if (!currentDocument.metadata.hiddenFields) {
    currentDocument.metadata.hiddenFields = [];
  }
  
  const hiddenFields = currentDocument.metadata.hiddenFields;
  const index = hiddenFields.indexOf(fieldName);
  
  if (index > -1) {
    // Field is hidden, make it visible
    hiddenFields.splice(index, 1);
  } else {
    // Field is visible, hide it
    hiddenFields.push(fieldName);
  }
  
  setModified(true);
  
  // Update UI
  updateRenderOrderList();
  renderDocumentPreview();
}

function saveRenderOrder() {
  if (!currentDocument) return;
  
  const container = document.getElementById('render-order-list');
  const items = container.querySelectorAll('.render-order-item');
  const newOrder = Array.from(items).map(item => item.dataset.field);
  
  currentDocument.metadata.renderOrder = newOrder;
  setModified(true);
  
  // Re-render preview with new order
  renderDocumentPreview();
}

function resetRenderOrder() {
  if (!currentDocument) return;
  
  currentDocument.metadata.renderOrder = null;
  currentDocument.metadata.hiddenFields = [];
  setModified(true);
  
  updateRenderOrderList();
  renderDocumentPreview();
}

function toggleFieldVisibility(fieldName) {
  if (!currentDocument) return;
  
  if (!currentDocument.metadata.hiddenFields) {
    currentDocument.metadata.hiddenFields = [];
  }
  
  const index = currentDocument.metadata.hiddenFields.indexOf(fieldName);
  if (index > -1) {
    // Show field
    currentDocument.metadata.hiddenFields.splice(index, 1);
  } else {
    // Hide field
    currentDocument.metadata.hiddenFields.push(fieldName);
  }
  
  setModified(true);
  updateRenderOrderList();
  renderDocumentPreview();
}

async function renderDocumentPreview() {
  const previewContainer = document.getElementById('document-preview');
  if (!previewContainer || !currentDocument || !schemaProperties) {
    return;
  }
  
  // Check if a template is active
  if (window.templateUI && window.templateUI.hasActiveTemplate()) {
    try {
      const markdown = window.markdownEditor;
      if (!markdown) {
        previewContainer.innerHTML = '<p class="error">Markdown renderer not loaded</p>';
        return;
      }
      
      // Render using template - ensure document has type property
      const documentWithType = {
        data: currentDocument.data,
        type: currentDocument.metadata.documentType
      };
      const templateMarkdown = await window.templateUI.renderWithTemplate(documentWithType);
      if (templateMarkdown) {
        const html = markdown.renderMarkdown(templateMarkdown);
        previewContainer.innerHTML = html;
        return;
      }
    } catch (err) {
      console.error('[Renderer] Error rendering with template:', err);
      previewContainer.innerHTML = `<p class="error">Template rendering error: ${err.message}</p>`;
      return;
    }
  }
  
  // Fall back to regular rendering with render order
  updateRenderOrderList();
  
  const renderOrder = getRenderOrder();
  const hiddenFields = currentDocument?.metadata?.hiddenFields || [];
  const markdown = window.markdownEditor;
  
  if (!markdown) {
    previewContainer.innerHTML = '<p class="error">Markdown renderer not loaded</p>';
    return;
  }
  
  let html = '';
  
  // Render title if exists
  if (currentDocument.data.title) {
    html += `<h1 class="doc-title">${escapeHtml(currentDocument.data.title)}</h1>`;
  }
  
  // Render fields in order, skipping hidden ones
  renderOrder.forEach(fieldName => {
    // Skip hidden fields
    if (hiddenFields.includes(fieldName)) {
      return;
    }
    
    const prop = schemaProperties.find(p => p.name === fieldName);
    const value = currentDocument.data[fieldName];
    
    if (!value || !prop) return;
    
    const displayName = prop.displayAs || prop.title || fieldName;
    
    // Skip title since we already rendered it
    if (fieldName === 'title') return;
    
    // Render section
    if (prop.type === 'string') {
      html += `<div class="preview-section">`;
      html += `<h2 class="section-title">${displayName}</h2>`;
      html += `<div class="section-content">${markdown.renderMarkdown(value)}</div>`;
      html += `</div>`;
    } else if (prop.type === 'array' && Array.isArray(value)) {
      html += `<div class="preview-section">`;
      html += `<h2 class="section-title">${displayName}</h2>`;
      html += `<div class="section-content">`;
      
      if (value.length === 0) {
        html += '<p><em>None</em></p>';
      } else {
        value.forEach((item, index) => {
          if (typeof item === 'string') {
            html += `<div class="array-item">${markdown.renderMarkdown(item)}</div>`;
          } else if (typeof item === 'object') {
            html += `<div class="array-item">`;
            html += renderObject(item, markdown);
            html += `</div>`;
          }
        });
      }
      
      html += `</div></div>`;
    } else if (prop.type === 'object' && typeof value === 'object') {
      html += `<div class="preview-section">`;
      html += `<h2 class="section-title">${displayName}</h2>`;
      html += `<div class="section-content">`;
      html += renderObject(value, markdown);
      html += `</div></div>`;
    }
  });
  
  previewContainer.innerHTML = html || '<p class="placeholder">No content to preview</p>';
}

// Expose for use by template-ui
window.updateDocumentPreview = renderDocumentPreview;

function renderObject(obj, markdown) {
  let html = '<div class="object-preview">';
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    // Skip undefined, null, or empty string values
    if (value === undefined || value === null || value === '') {
      return;
    }
    
    html += `<div class="object-field">`;
    html += `<span class="object-key">${escapeHtml(key)}:</span> `;
    
    if (typeof value === 'string') {
      html += `<span class="object-value">${markdown.renderMarkdown(value)}</span>`;
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        html += `<span class="object-value">${escapeHtml(JSON.stringify(value))}</span>`;
      }
    } else if (typeof value === 'object') {
      html += renderObject(value, markdown);
    } else {
      html += `<span class="object-value">${escapeHtml(String(value))}</span>`;
    }
    
    html += `</div>`;
  });
  
  html += '</div>';
  return html;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function exportPreviewHTML() {
  if (!currentDocument) {
    alert('No document to export');
    return;
  }
  
  const previewContainer = document.getElementById('document-preview');
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(currentDocument.data.title || 'Document')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { margin-top: 30px; color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin: 20px 0; padding-left: 16px; color: #666; }
  </style>
</head>
<body>
${previewContainer.innerHTML}
</body>
</html>
  `;
  
  // Save to file
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentDocument.data.title || 'document'}.html`;
  a.click();
  URL.revokeObjectURL(url);
  
  updateStatus('Preview exported to HTML');
}

// Expose functions and state for main process to call
window.saveDocument = saveDocument;
Object.defineProperty(window, 'isModified', {
  get: () => isModified
});

// Helper function to get value at path
function getValueAtPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    current = current[part];
    if (current === undefined) return undefined;
  }
  return current;
}

// Panel Toggle and Resize Functionality
const sidebar = document.querySelector('.sidebar');
const propertiesPanel = document.querySelector('.properties-panel');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const togglePropertiesBtn = document.getElementById('toggle-properties');

console.log('Toggle buttons:', { sidebar: toggleSidebarBtn, properties: togglePropertiesBtn });
console.log('Panels:', { sidebar, propertiesPanel });

// Toggle sidebar
toggleSidebarBtn?.addEventListener('click', () => {
  console.log('Toggling sidebar');
  const isHidden = sidebar.classList.contains('hidden');
  
  if (isHidden) {
    // Show sidebar
    sidebar.classList.remove('hidden');
    const savedWidth = localStorage.getItem('sidebar-width-before-hide') || '250px';
    sidebar.style.width = savedWidth;
    localStorage.setItem('sidebar-hidden', 'false');
  } else {
    // Hide sidebar
    localStorage.setItem('sidebar-width-before-hide', sidebar.style.width || getComputedStyle(sidebar).width);
    sidebar.style.width = '0';
    sidebar.classList.add('hidden');
    localStorage.setItem('sidebar-hidden', 'true');
  }
});

// Toggle properties panel
togglePropertiesBtn?.addEventListener('click', () => {
  console.log('Toggling properties panel');
  const isHidden = propertiesPanel.classList.contains('hidden');
  
  if (isHidden) {
    // Show panel
    propertiesPanel.classList.remove('hidden');
    const savedWidth = localStorage.getItem('properties-width-before-hide') || '300px';
    propertiesPanel.style.width = savedWidth;
    localStorage.setItem('properties-hidden', 'false');
  } else {
    // Hide panel
    localStorage.setItem('properties-width-before-hide', propertiesPanel.style.width || getComputedStyle(propertiesPanel).width);
    propertiesPanel.style.width = '0';
    propertiesPanel.classList.add('hidden');
    localStorage.setItem('properties-hidden', 'true');
  }
});

// Restore panel states from localStorage
if (localStorage.getItem('sidebar-hidden') === 'true') {
  sidebar.classList.add('hidden');
}
if (localStorage.getItem('properties-hidden') === 'true') {
  propertiesPanel.classList.add('hidden');
}

// Resize functionality
function initResize() {
  const resizeHandles = document.querySelectorAll('.resize-handle');
  
  resizeHandles.forEach(handle => {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let panel = null;
    
    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      panel = handle.closest('.sidebar, .properties-panel');
      startWidth = panel.offsetWidth;
      handle.classList.add('resizing');
      
      // Prevent text selection during resize
      e.preventDefault();
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const isRightHandle = handle.classList.contains('resize-handle-right');
      const delta = isRightHandle ? e.clientX - startX : startX - e.clientX;
      const newWidth = startWidth + delta;
      
      // Apply min/max constraints
      const minWidth = parseInt(getComputedStyle(panel).minWidth);
      const maxWidth = parseInt(getComputedStyle(panel).maxWidth);
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        panel.style.width = newWidth + 'px';
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        handle.classList.remove('resizing');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        // Save width to localStorage
        if (panel) {
          const key = panel.classList.contains('sidebar') ? 'sidebar-width' : 'properties-width';
          localStorage.setItem(key, panel.style.width);
        }
      }
    });
  });
  
  // Restore widths from localStorage
  const sidebarWidth = localStorage.getItem('sidebar-width');
  const propertiesWidth = localStorage.getItem('properties-width');
  
  if (sidebarWidth) {
    sidebar.style.width = sidebarWidth;
  }
  if (propertiesWidth) {
    propertiesPanel.style.width = propertiesWidth;
  }
}

// Initialize resize handles
initResize();

// Initialize menu action listeners
initMenuListeners();

// Update menu state helper
function updateMenuState() {
  if (window.electronAPI && window.electronAPI.updateMenuState) {
    window.electronAPI.updateMenuState({
      hasDocument: !!currentDocument,
      isModified: isModified,
      canUndo: false, // TODO: Implement undo/redo
      canRedo: false, // TODO: Implement undo/redo
      isHosting: false, // TODO: Track collaboration state
      isInSession: false // TODO: Track collaboration state
    });
  }
}

// Initialize menu action listeners
function initMenuListeners() {
  if (!window.electronAPI || !window.electronAPI.onMenuAction) {
    console.warn('electronAPI or onMenuAction not available');
    return;
  }
  
  console.log('Initializing menu listeners...');
  
  // File menu actions
  window.electronAPI.onMenuAction('menu-new-document', () => {
    console.log('[Menu] New document triggered');
    createNewDocument();
  });
  window.electronAPI.onMenuAction('menu-open-document', () => {
    console.log('[Menu] Open document triggered');
    openDocument();
  });
  window.electronAPI.onMenuAction('menu-close-document', () => {
    console.log('[Menu] Close document triggered');
    closeDocument();
  });
  window.electronAPI.onMenuAction('menu-save-document', () => {
    console.log('[Menu] Save document triggered');
    saveDocument();
  });
  window.electronAPI.onMenuAction('menu-save-document-as', () => {
    console.log('[Menu] Save As triggered');
    saveDocumentAs();
  });
  window.electronAPI.onMenuAction('menu-export-json', () => {
    console.log('[Menu] Export JSON triggered');
    exportToJson();
  });
  window.electronAPI.onMenuAction('menu-export-html', () => {
    console.log('[Menu] Export HTML triggered');
    exportPreviewHTML();
  });
  
  // Import actions
  window.electronAPI.onMenuAction('menu-import-json-existing', async () => {
    if (!currentDocument) {
      alert('No document is currently open. Please open a document first.');
      return;
    }
    const dialogResult = await window.electronAPI.openDocumentDialog();
    if (!dialogResult.success) return;
    
    const result = await window.electronAPI.importCleanJSON(dialogResult.filePath, currentDocument);
    if (result.success) {
      currentDocument = result.document;
      setModified(true);
      await renderDocument();
      updateStatus('JSON imported successfully into current document');
    } else {
      updateStatus('Error importing JSON: ' + result.error);
    }
  });
  
  window.electronAPI.onMenuAction('menu-import-json-new', async () => {
    // Trigger the create from file dialog
    createNewDocument();
  });
  
  // View menu actions
  window.electronAPI.onMenuAction('menu-toggle-sidebar', () => {
    toggleSidebarBtn?.click();
  });
  
  window.electronAPI.onMenuAction('menu-toggle-properties', () => {
    togglePropertiesBtn?.click();
  });
  
  window.electronAPI.onMenuAction('menu-zoom-in', () => {
    document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.1).toString();
  });
  
  window.electronAPI.onMenuAction('menu-zoom-out', () => {
    document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) - 0.1).toString();
  });
  
  window.electronAPI.onMenuAction('menu-zoom-reset', () => {
    document.body.style.zoom = '1';
  });
  
  // Document menu actions
  window.electronAPI.onMenuAction('menu-add-section', () => addSection());
  
  window.electronAPI.onMenuAction('menu-validate', async () => {
    if (currentDocument) {
      await validateAndDisplayErrors();
      updateStatus('Validation complete');
    }
  });
  
  window.electronAPI.onMenuAction('menu-document-properties', () => {
    // Switch to metadata panel
    document.querySelector('[data-tab="metadata"]')?.click();
  });
  
  // Collaboration menu actions
  window.electronAPI.onMenuAction('menu-host-session', () => {
    const collabDialog = document.getElementById('collab-dialog');
    const collabBtn = document.getElementById('collab-btn');
    
    // Open dialog if not already open
    if (collabDialog && collabDialog.style.display !== 'flex') {
      collabBtn?.click();
    }
    
    // Switch to host tab
    setTimeout(() => {
      const hostTab = document.querySelector('.collab-tab[data-tab="host"]');
      hostTab?.click();
    }, 100);
  });
  
  window.electronAPI.onMenuAction('menu-join-session', () => {
    console.log('[Menu] Join session triggered');
    const collabDialog = document.getElementById('collab-dialog');
    const collabBtn = document.getElementById('collab-btn');
    
    // Open dialog if not already open
    if (collabDialog.style.display !== 'flex') {
      collabBtn?.click();
    }
    
    // Switch to join tab
    setTimeout(() => {
      const joinTab = document.querySelector('.collab-tab[data-tab="join"]');
      joinTab?.click();
    }, 100);
  });
  
  window.electronAPI.onMenuAction('menu-stop-hosting', () => {
    console.log('[Menu] Stop hosting triggered');
    // TODO: Implement stop hosting
    updateStatus('Stop hosting not yet implemented');
  });
  
  window.electronAPI.onMenuAction('menu-session-info', () => {
    console.log('[Menu] Session info triggered');
    const collabDialog = document.getElementById('collab-dialog');
    const collabBtn = document.getElementById('collab-btn');
    
    // Open dialog if not already open
    if (collabDialog.style.display !== 'flex') {
      collabBtn?.click();
    }
    
    // Switch to active session tab
    setTimeout(() => {
      const activeTab = document.querySelector('.collab-tab[data-tab="active"]');
      activeTab?.click();
    }, 100);
  });
  
  // Recent files
  window.electronAPI.onMenuAction('menu-open-recent', async (event, filePath) => {
    try {
      const result = await window.electronAPI.loadDocument(filePath);
      if (result.success) {
        currentDocument = result.document;
        currentFilePath = result.document.filePath;
        documentType = result.document.metadata.documentType;
        setModified(false);
        
        const structure = await window.electronAPI.getSchemaStructure(documentType);
        schemaProperties = structure;
        
        await renderDocument();
        updateStatus('Document loaded successfully');
        updateMenuState();
      } else {
        updateStatus('Error loading: ' + result.error);
      }
    } catch (err) {
      updateStatus('Error opening document: ' + err.message);
    }
  });
  
  window.electronAPI.onMenuAction('menu-clear-recent', async () => {
    // TODO: Implement clear recent files
    updateStatus('Recent files cleared');
  });
  
  // Help menu
  window.electronAPI.onMenuAction('menu-keyboard-shortcuts', () => {
    showKeyboardShortcuts();
  });
  
  window.electronAPI.onMenuAction('menu-about', () => {
    showAboutDialog();
  });
}

function showKeyboardShortcuts() {
  alert(`Keyboard Shortcuts:
  
File:
  Ctrl/Cmd+N - New Document
  Ctrl/Cmd+O - Open Document  
  Ctrl/Cmd+W - Close Document
  Ctrl/Cmd+S - Save
  Ctrl/Cmd+Shift+S - Save As
  
View:
  Ctrl/Cmd+1 - Toggle Sidebar
  Ctrl/Cmd+2 - Toggle Properties
  Ctrl/Cmd++ - Zoom In
  Ctrl/Cmd+- - Zoom Out
  Ctrl/Cmd+0 - Reset Zoom
  
Document:
  Ctrl/Cmd+Shift+V - Validate Document`);
}

function showAboutDialog() {
  alert(`MDWriter
  
A structured writing application for Module Descriptors

Version: 1.0.0
Built with Electron

© 2025`);
}

// Initialize
updateStatus('Ready');
updateMenuState();
initCollaboration();

