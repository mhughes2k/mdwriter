/**
 * Markdown Editor Component
 * Provides a textarea with live preview toggle for Markdown content
 */

class MarkdownEditor {
  constructor() {
    // Load marked library (will be available globally in Electron)
    this.marked = null;
    this.loadMarked();
  }

  async loadMarked() {
    try {
      // Wait for marked to be available from bundled script
      // It will be loaded via script tag in index.html
      const checkMarked = () => {
        if (typeof marked !== 'undefined') {
          this.marked = marked;
          
          // Configure marked for GitHub Flavored Markdown
          if (this.marked && this.marked.setOptions) {
            this.marked.setOptions({
              gfm: true,
              breaks: true,
              tables: true,
              smartLists: true,
              smartypants: true
            });
          }
          console.log('Marked.js loaded successfully');
        } else {
          // Retry after a short delay
          setTimeout(checkMarked, 100);
        }
      };
      
      checkMarked();
    } catch (err) {
      console.error('Failed to load marked.js:', err);
    }
  }

  /**
   * Create a Markdown editor element
   * @param {string} fieldPath - Field path for data binding
   * @param {string} value - Initial value
   * @param {object} property - Schema property definition
   * @returns {HTMLElement} - Editor container
   */
  createEditor(fieldPath, value = '', property = {}) {
    const container = document.createElement('div');
    container.className = 'markdown-editor-container';
    container.dataset.fieldPath = fieldPath;

    const isTextarea = property.displayType === 'textarea';

    container.innerHTML = `
      <div class="markdown-editor-body">
        <div class="markdown-edit-pane active">
          ${isTextarea 
            ? `<textarea data-field-path="${fieldPath}" rows="10">${this.escapeHtml(value)}</textarea>`
            : `<input type="text" data-field-path="${fieldPath}" value="${this.escapeHtml(value)}">`
          }
          <div class="markdown-help-hint">
            💡 Supports Markdown: **bold**, *italic*, [links](url), tables, code blocks, etc.
          </div>
        </div>
        <div class="markdown-preview-pane">
          <div class="markdown-rendered"></div>
        </div>
      </div>
      <div class="markdown-editor-footer">
        <div class="markdown-editor-controls">
          <button type="button" class="md-tab active" data-mode="edit">
            ✏️ Edit
          </button>
          <button type="button" class="md-tab" data-mode="preview">
            👁️ Preview
          </button>
          <button type="button" class="md-tab" data-mode="split">
            ⚡ Split
          </button>
        </div>
      </div>
    `;

    // Setup event handlers
    this.setupEditor(container);

    return container;
  }

  setupEditor(container) {
    const editPane = container.querySelector('.markdown-edit-pane');
    const previewPane = container.querySelector('.markdown-preview-pane');
    const renderedDiv = container.querySelector('.markdown-rendered');
    const input = container.querySelector('[data-field-path]');
    const tabs = container.querySelectorAll('.md-tab');

    // Load user's preferred view mode
    this.loadViewModePreference(tabs, editPane, previewPane, container, renderedDiv, input);

    // Mode switching
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update view
        editPane.classList.remove('active');
        previewPane.classList.remove('active');
        container.classList.remove('split-mode');

        if (mode === 'edit') {
          editPane.classList.add('active');
        } else if (mode === 'preview') {
          previewPane.classList.add('active');
          this.updatePreview(input.value, renderedDiv);
        } else if (mode === 'split') {
          editPane.classList.add('active');
          previewPane.classList.add('active');
          container.classList.add('split-mode');
          this.updatePreview(input.value, renderedDiv);
        }
        
        // Save user's preference
        this.saveViewModePreference(mode);
      });
    });

    // Live preview update in split mode
    input.addEventListener('input', () => {
      if (container.classList.contains('split-mode')) {
        this.updatePreview(input.value, renderedDiv);
      }
    });

    // Debounced preview update for preview-only mode
    let previewTimeout;
    input.addEventListener('input', () => {
      if (previewPane.classList.contains('active') && !editPane.classList.contains('active')) {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
          this.updatePreview(input.value, renderedDiv);
        }, 300);
      }
    });
  }

  updatePreview(markdown, targetElement) {
    if (!this.marked) {
      targetElement.innerHTML = '<p><em>Loading Markdown renderer...</em></p>';
      return;
    }

    try {
      const html = this.marked.parse(markdown || '*No content*');
      targetElement.innerHTML = html;
    } catch (err) {
      targetElement.innerHTML = `<p class="error">Error rendering Markdown: ${this.escapeHtml(err.message)}</p>`;
    }
  }
  
  /**
   * Load and apply user's view mode preference
   */
  async loadViewModePreference(tabs, editPane, previewPane, container, renderedDiv, input) {
    if (!window.electronAPI || !window.electronAPI.configGetPreference) {
      // Default to split mode if API not available
      this.setViewMode('split', tabs, editPane, previewPane, container, renderedDiv, input);
      return;
    }
    
    try {
      const result = await window.electronAPI.configGetPreference('markdownEditorViewMode', 'split');
      const mode = result.success ? result.value : 'split';
      this.setViewMode(mode, tabs, editPane, previewPane, container, renderedDiv, input);
    } catch (err) {
      console.error('Error loading markdown view mode preference:', err);
      this.setViewMode('split', tabs, editPane, previewPane, container, renderedDiv, input);
    }
  }
  
  /**
   * Set the view mode
   */
  setViewMode(mode, tabs, editPane, previewPane, container, renderedDiv, input) {
    // Update active tab
    tabs.forEach(t => {
      t.classList.remove('active');
      if (t.dataset.mode === mode) {
        t.classList.add('active');
      }
    });

    // Update view
    editPane.classList.remove('active');
    previewPane.classList.remove('active');
    container.classList.remove('split-mode');

    if (mode === 'edit') {
      editPane.classList.add('active');
    } else if (mode === 'preview') {
      previewPane.classList.add('active');
      this.updatePreview(input.value, renderedDiv);
    } else if (mode === 'split') {
      editPane.classList.add('active');
      previewPane.classList.add('active');
      container.classList.add('split-mode');
      this.updatePreview(input.value, renderedDiv);
    }
  }
  
  /**
   * Save user's view mode preference
   */
  async saveViewModePreference(mode) {
    if (!window.electronAPI || !window.electronAPI.configSetPreference) {
      return;
    }
    
    try {
      await window.electronAPI.configSetPreference('markdownEditorViewMode', mode);
    } catch (err) {
      console.error('Error saving markdown view mode preference:', err);
    }
  }

  /**
   * Render Markdown to HTML (for document preview)
   * @param {string} markdown - Markdown content
   * @returns {string} - Rendered HTML
   */
  renderMarkdown(markdown) {
    if (!this.marked || !markdown) {
      return '';
    }
    
    try {
      return this.marked.parse(markdown);
    } catch (err) {
      return `<p class="error">Error: ${this.escapeHtml(err.message)}</p>`;
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export singleton instance
if (typeof window !== 'undefined') {
  window.markdownEditor = new MarkdownEditor();
}
