/**
 * Template UI Manager
 * 
 * Manages template selection and preview rendering in the UI
 */

class TemplateUI {
  constructor() {
    this.currentTemplates = [];
    this.activeTemplateId = null;
    this.elements = {
      templateSelect: document.getElementById('template-select'),
      refreshTemplates: document.getElementById('refresh-templates'),
      renderOrderSection: document.getElementById('render-order-section')
    };
    
    this.initializeEventListeners();
  }
  
  initializeEventListeners() {
    // Template selection change
    this.elements.templateSelect?.addEventListener('change', async (e) => {
      await this.handleTemplateChange(e.target.value);
    });
    
    // Refresh templates button
    this.elements.refreshTemplates?.addEventListener('click', async () => {
      if (typeof documentType !== 'undefined' && documentType) {
        await this.loadTemplates(documentType);
      }
    });
  }
  
  /**
   * Load templates for current document type
   */
  async loadTemplates(docType) {
    try {
      const result = await window.electronAPI.templatesLoad(docType);
      
      if (result.success) {
        this.currentTemplates = result.templates;
        this.updateTemplateSelector();
        
        // Load active template from document metadata (if document is loaded)
        if (typeof currentDocument !== 'undefined' && currentDocument?.metadata?.activeTemplate) {
          const requestedTemplateId = currentDocument.metadata.activeTemplate;
          
          // Check if the template still exists
          const templateExists = this.currentTemplates.some(t => t.id === requestedTemplateId);
          
          if (templateExists) {
            this.activeTemplateId = requestedTemplateId;
            this.elements.templateSelect.value = this.activeTemplateId;
            await this.handleTemplateChange(this.activeTemplateId, false); // Don't save back to metadata
          } else {
            // Template no longer available - fall back to default rendering
            console.warn('[TemplateUI] Template not found:', requestedTemplateId);
            this.showTemplateNotFoundNotification(requestedTemplateId);
            
            // Clear the template selection
            this.activeTemplateId = null;
            this.elements.templateSelect.value = '';
            currentDocument.metadata.activeTemplate = null;
            
            // Show render order controls
            if (this.elements.renderOrderSection) {
              this.elements.renderOrderSection.style.display = 'block';
            }
          }
        }
        
        console.log(`[TemplateUI] Loaded ${this.currentTemplates.length} templates`);
      }
    } catch (err) {
      console.error('[TemplateUI] Error loading templates:', err);
    }
  }
  
  /**
   * Show notification that a template was not found
   */
  showTemplateNotFoundNotification(templateId) {
    if (typeof updateStatus === 'function') {
      updateStatus(`Template "${templateId}" is no longer available. Using default preview.`);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        if (typeof updateStatus === 'function') {
          updateStatus('Ready');
        }
      }, 5000);
    }
  }
  
  /**
   * Update template selector dropdown
   */
  updateTemplateSelector() {
    // Clear all existing options and optgroups except the first option (no template)
    const firstOption = this.elements.templateSelect.options[0];
    this.elements.templateSelect.innerHTML = '';
    this.elements.templateSelect.appendChild(firstOption);
    
    // Group templates by source
    const bundledTemplates = this.currentTemplates.filter(t => t.source === 'bundled');
    const userTemplates = this.currentTemplates.filter(t => t.source === 'user');
    
    // Add bundled templates
    if (bundledTemplates.length > 0) {
      const bundledGroup = document.createElement('optgroup');
      bundledGroup.label = 'Bundled Templates';
      
      bundledTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        if (template.description) {
          option.title = template.description;
        }
        bundledGroup.appendChild(option);
      });
      
      this.elements.templateSelect.appendChild(bundledGroup);
    }
    
    // Add user templates
    if (userTemplates.length > 0) {
      const userGroup = document.createElement('optgroup');
      userGroup.label = 'User Templates';
      
      userTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        if (template.description) {
          option.title = template.description;
        }
        userGroup.appendChild(option);
      });
      
      this.elements.templateSelect.appendChild(userGroup);
    }
  }
  
  /**
   * Handle template selection change
   * @param {string} templateId - Template ID or empty string
   * @param {boolean} saveToMetadata - Whether to save to document metadata (default true)
   */
  async handleTemplateChange(templateId, saveToMetadata = true) {
    // Don't mark as modified during initial document load
    const isLoading = typeof window.isLoadingDocument === 'function' && window.isLoadingDocument();
    console.log('[TemplateUI] handleTemplateChange called: templateId=' + templateId + ', saveToMetadata=' + saveToMetadata + ', isLoading=' + isLoading);
    
    this.activeTemplateId = templateId;
    
    // Save active template to document metadata
    if (saveToMetadata && typeof currentDocument !== 'undefined' && currentDocument) {
      currentDocument.metadata.activeTemplate = templateId || null;
      currentDocument.metadata.modified = new Date().toISOString();
      
      // Mark document as modified (but not during initial load)
      if (!isLoading && typeof isModified !== 'undefined') {
        console.log('[TemplateUI] Marking document as modified');
        isModified = true;
      } else {
        console.log('[TemplateUI] NOT marking as modified (isLoading=' + isLoading + ')');
      }
      
      console.log('[TemplateUI] Saved active template to document metadata:', templateId || 'none');
    }
    
    // Show/hide render order controls based on template selection
    if (this.elements.renderOrderSection) {
      if (templateId) {
        // Template selected - hide render order controls
        this.elements.renderOrderSection.style.display = 'none';
      } else {
        // No template - show render order controls
        this.elements.renderOrderSection.style.display = 'block';
      }
    }
    
    // Re-render preview
    if (typeof updateDocumentPreview === 'function') {
      await updateDocumentPreview();
    }
  }
  
  /**
   * Render document using active template
   */
  async renderWithTemplate(document) {
    if (!this.activeTemplateId) {
      return null;
    }
    
    try {
      const result = await window.electronAPI.templatesRender(
        this.activeTemplateId,
        document.data,
        document.type
      );
      
      if (result.success) {
        return result.output;
      } else {
        console.error('[TemplateUI] Template rendering failed:', result.error);
        return null;
      }
    } catch (err) {
      console.error('[TemplateUI] Error rendering template:', err);
      return null;
    }
  }
  
  /**
   * Check if a template is active
   */
  hasActiveTemplate() {
    return !!this.activeTemplateId;
  }
  
  /**
   * Get active template ID
   */
  getActiveTemplateId() {
    return this.activeTemplateId;
  }
}

// Global instance
let templateUI = null;

function initializeTemplateUI() {
  if (!templateUI) {
    templateUI = new TemplateUI();
  }
  return templateUI;
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.TemplateUI = TemplateUI;
  window.initializeTemplateUI = initializeTemplateUI;
  window.templateUI = null; // Will be set by initializeTemplateUI
}
