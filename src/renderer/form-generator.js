// Form Generator - Creates UI elements based on JSON schema properties

class FormGenerator {
  constructor() {
    this.fieldHandlers = new Map();
    this.customFormHandlers = new Map();
    this.documentType = null;
  }

  /**
   * Register a custom form handler
   */
  registerCustomForm(formType, handler) {
    this.customFormHandlers.set(formType, handler);
  }

  /**
   * Set the current document type
   */
  setDocumentType(documentType) {
    this.documentType = documentType;
  }

  /**
   * Generate a form field based on schema property
   */
  async generateField(property, value, fieldPath) {
    const container = document.createElement('div');
    container.className = 'form-field';
    container.dataset.fieldPath = fieldPath;

    const label = document.createElement('label');
    label.className = 'field-label';
    
    // Use displayAs from property if available, otherwise use title or name
    const displayLabel = property.displayAs || property.title || property.name;
    const schemaLabel = property.title || property.name;
    
    // Show displayAs with schema name in parentheses if different
    if (property.displayAs && property.displayAs !== schemaLabel) {
      label.innerHTML = `${displayLabel} <span class="schema-label">(${schemaLabel})</span>`;
    } else {
      label.textContent = displayLabel;
    }
    
    if (property.required) {
      label.classList.add('required');
      const requiredMark = document.createElement('span');
      requiredMark.className = 'required-mark';
      requiredMark.textContent = ' *';
      label.appendChild(requiredMark);
    }
    container.appendChild(label);

    if (property.description) {
      const desc = document.createElement('div');
      desc.className = 'field-description';
      desc.textContent = property.description;
      container.appendChild(desc);
    }

    const input = await this.createInput(property, value, fieldPath);
    container.appendChild(input);

    return container;
  }

  /**
   * Create appropriate input element based on property type
   */
  async createInput(property, value, fieldPath) {
    // Check for custom form first
    if (property.customForm && property.customFormConfig) {
      return await this.createCustomForm(property, value, fieldPath);
    }

    // Handle array types
    if (property.type === 'array') {
      return this.createArrayInput(property, value, fieldPath);
    }

    // Handle object references
    if (property.$ref) {
      return this.createReferenceInput(property, value, fieldPath);
    }

    // Handle different primitive types
    switch (property.type) {
      case 'string':
        // Check displayType from metadata first, then format from schema
        if (property.displayType === 'textarea' || property.format === 'textarea') {
          return this.createTextarea(property, value, fieldPath);
        }
        return this.createTextInput(property, value, fieldPath);
      
      case 'number':
      case 'integer':
        return this.createNumberInput(property, value, fieldPath);
      
      case 'boolean':
        return this.createCheckbox(property, value, fieldPath);
      
      default:
        return this.createTextInput(property, value, fieldPath);
    }
  }

  /**
   * Create custom form widget
   */
  async createCustomForm(property, value, fieldPath) {
    const formConfig = property.customFormConfig;
    const formType = formConfig.type;

    console.log(`[FormGen] Creating custom form: ${formType} for field: ${fieldPath}`);

    // Get the API (platformAPI or electronAPI)
    const api = window.platformAPI || window.electronAPI;
    if (!api || !api.getCustomFormData) {
      console.error('API not available for custom forms');
      return this.createPlaceholder(`Custom forms not available`);
    }

    // Load custom form data and implementation from backend
    try {
      const result = await api.getCustomFormData(this.documentType, property.customForm);
      
      console.log(`[FormGen] Custom form data loaded:`, result);
      
      if (result.error) {
        console.error('Error loading custom form data:', result.error);
        return this.createPlaceholder(`Error loading ${formType} form`);
      }

      // If implementation is provided, load it as a script
      if (result.implementation) {
        try {
          // Load the implementation if not already loaded
          if (!window.customFormFactories) {
            window.customFormFactories = {};
          }
          
          const factoryKey = property.customForm;
          
          // Execute the implementation code once to register the factory
          if (!window.customFormFactories[factoryKey]) {
            console.log(`[FormGen] Loading custom form factory: ${factoryKey}`);
            // Use inline script execution (allowed by CSP 'unsafe-inline')
            const script = document.createElement('script');
            script.textContent = result.implementation + `\nwindow.customFormFactories['${factoryKey}'] = createCustomForm;`;
            document.head.appendChild(script);
            document.head.removeChild(script);
            console.log(`[FormGen] Factory registered:`, typeof window.customFormFactories[factoryKey]);
          }
          
          const factory = window.customFormFactories[factoryKey];
          if (typeof factory !== 'function') {
            throw new Error('createCustomForm function not found in implementation');
          }
          
          console.log(`[FormGen] Calling factory for: ${factoryKey}`);
          const element = factory(property, value, fieldPath, result.data);
          console.log(`[FormGen] Factory returned:`, element);
          
          // Wrap custom form to provide standard interface
          const wrapper = this.wrapCustomForm(element, fieldPath, property);
          return wrapper;
        } catch (err) {
          console.error('Error executing custom form implementation:', err);
          return this.createPlaceholder(`Error executing ${formType}: ${err.message}`);
        }
      }

      // No implementation provided - cannot render
      return this.createPlaceholder(`Custom form implementation required: ${formType}`);
    } catch (err) {
      console.error('Error creating custom form:', err);
      return this.createPlaceholder(`Error: ${err.message}`);
    }
  }

  /**
   * Create placeholder for unsupported forms
   */
  createPlaceholder(text) {
    const placeholder = document.createElement('div');
    placeholder.className = 'custom-form-placeholder';
    placeholder.textContent = text;
    return placeholder;
  }

  createTextInput(property, value, fieldPath) {
    // Use Markdown editor for text inputs
    if (window.markdownEditor) {
      return window.markdownEditor.createEditor(fieldPath, value, {
        ...property,
        displayType: 'text'
      });
    }
    
    // Fallback to regular input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'field-input';
    input.value = value || '';
    input.dataset.fieldPath = fieldPath;
    input.placeholder = property.placeholder || property.description || '';
    
    // Add change listener for collaboration
    input.addEventListener('input', (e) => {
      this.handleFieldChange(fieldPath, e.target.value);
    });
    
    // Send cursor update on focus
    input.addEventListener('focus', () => {
      if (typeof window.sendCursorUpdate === 'function') {
        window.sendCursorUpdate(fieldPath);
      }
    });
    
    // Clear cursor update on blur
    input.addEventListener('blur', () => {
      if (typeof window.sendCursorUpdate === 'function') {
        window.sendCursorUpdate(null);
      }
    });
    
    return input;
  }

  createTextarea(property, value, fieldPath) {
    // Use Markdown editor for textareas
    if (window.markdownEditor) {
      return window.markdownEditor.createEditor(fieldPath, value, {
        ...property,
        displayType: 'textarea'
      });
    }
    
    // Fallback to regular textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'field-textarea';
    textarea.value = value || '';
    textarea.dataset.fieldPath = fieldPath;
    textarea.placeholder = property.placeholder || property.description || '';
    textarea.rows = 6;
    
    // Add change listener for collaboration
    textarea.addEventListener('input', (e) => {
      this.handleFieldChange(fieldPath, e.target.value);
    });
    
    // Send cursor update on focus
    textarea.addEventListener('focus', () => {
      if (typeof window.sendCursorUpdate === 'function') {
        window.sendCursorUpdate(fieldPath);
      }
    });
    
    // Clear cursor update on blur
    textarea.addEventListener('blur', () => {
      if (typeof window.sendCursorUpdate === 'function') {
        window.sendCursorUpdate(null);
      }
    });
    
    return textarea;
  }

  createNumberInput(property, value, fieldPath) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'field-input';
    input.value = value !== undefined ? value : '';
    input.dataset.fieldPath = fieldPath;
    
    // Add change listener for collaboration
    input.addEventListener('input', (e) => {
      const numValue = e.target.value === '' ? null : Number(e.target.value);
      this.handleFieldChange(fieldPath, numValue);
    });
    
    // Send cursor update on focus
    input.addEventListener('focus', () => {
      if (typeof window.sendCursorUpdate === 'function') {
        window.sendCursorUpdate(fieldPath);
      }
    });
    
    // Clear cursor update on blur
    input.addEventListener('blur', () => {
      if (typeof window.sendCursorUpdate === 'function') {
        window.sendCursorUpdate(null);
      }
    });
    
    if (property.minimum !== undefined) {
      input.min = property.minimum;
    }
    if (property.maximum !== undefined) {
      input.max = property.maximum;
    }
    
    return input;
  }

  createCheckbox(property, value, fieldPath) {
    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-wrapper';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'field-checkbox';
    input.checked = value || false;
    input.dataset.fieldPath = fieldPath;
    
    // Add change listener for collaboration
    input.addEventListener('change', (e) => {
      this.handleFieldChange(fieldPath, e.target.checked);
    });
    
    wrapper.appendChild(input);
    return wrapper;
  }

  createArrayInput(property, value, fieldPath) {
    const container = document.createElement('div');
    container.className = 'array-field';
    container.dataset.fieldPath = fieldPath;

    const items = value || [];
    const itemsList = document.createElement('div');
    itemsList.className = 'array-items';

    items.forEach((item, index) => {
      const itemElement = this.createArrayItem(property, item, `${fieldPath}[${index}]`, index);
      itemsList.appendChild(itemElement);
    });

    container.appendChild(itemsList);

    const addButton = document.createElement('button');
    addButton.className = 'btn-add-item';
    addButton.textContent = `+ Add ${property.title || property.name}`;
    addButton.type = 'button';
    addButton.onclick = () => {
      const event = new CustomEvent('add-array-item', {
        detail: { arrayPath: fieldPath, property }
      });
      document.dispatchEvent(event);
    };
    container.appendChild(addButton);

    return container;
  }

  createArrayItem(property, item, itemPath, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'array-item';
    itemElement.dataset.index = index;

    const itemContent = document.createElement('div');
    itemContent.className = 'array-item-content';

    if (property.$ref) {
      // Complex object - show as expandable section
      const summary = document.createElement('div');
      summary.className = 'array-item-summary';
      summary.textContent = this.getItemSummary(item);
      itemContent.appendChild(summary);
    } else if (typeof item === 'string') {
      // Simple string item
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'field-input';
      input.value = item;
      input.dataset.fieldPath = itemPath;
      itemContent.appendChild(input);
    } else {
      // Other simple types
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'field-input';
      input.value = JSON.stringify(item);
      input.dataset.fieldPath = itemPath;
      itemContent.appendChild(input);
    }

    itemElement.appendChild(itemContent);

    const removeButton = document.createElement('button');
    removeButton.className = 'btn-remove-item';
    removeButton.textContent = '×';
    removeButton.type = 'button';
    removeButton.onclick = () => {
      const event = new CustomEvent('remove-array-item', {
        detail: { arrayPath: property.name, index }
      });
      document.dispatchEvent(event);
    };
    itemElement.appendChild(removeButton);

    return itemElement;
  }

  createReferenceInput(property, value, fieldPath) {
    const placeholder = document.createElement('div');
    placeholder.className = 'reference-placeholder';
    placeholder.textContent = `Reference to ${property.$ref} (complex object)`;
    placeholder.dataset.ref = property.$ref;
    placeholder.dataset.fieldPath = fieldPath;
    return placeholder;
  }

  getItemSummary(item) {
    if (typeof item === 'string') {
      return item.substring(0, 50) + (item.length > 50 ? '...' : '');
    }
    if (item.title) return item.title;
    if (item.name) return item.name;
    if (item.description) return item.description.substring(0, 50);
    return 'Item';
  }

  /**
   * Wrap custom form to provide standard interface
   */
  wrapCustomForm(element, fieldPath, property) {
    // Store reference to the custom form element
    if (!this.customFormInstances) {
      this.customFormInstances = new Map();
    }
    
    // Add cursor tracking to all interactive elements in custom form
    const interactiveElements = element.querySelectorAll('input, select, textarea');
    interactiveElements.forEach(input => {
      // Send cursor update on focus
      input.addEventListener('focus', () => {
        console.log('[FormGen] Custom form element focused:', fieldPath);
        if (typeof window.sendCursorUpdate === 'function') {
          window.sendCursorUpdate(fieldPath);
        }
      });
      
      // Clear cursor update on blur
      input.addEventListener('blur', () => {
        console.log('[FormGen] Custom form element blurred:', fieldPath);
        if (typeof window.sendCursorUpdate === 'function') {
          window.sendCursorUpdate(null);
        }
      });
    });
    
    // Create a wrapper that provides getValue and setValue methods
    const customForm = {
      element: element,
      fieldPath: fieldPath,
      
      // Get current value from the custom form
      getValue: function() {
        // Try to find the primary input/select element
        const select = element.querySelector('select[data-field-path]');
        if (select && select.value) {
          try {
            return JSON.parse(select.value);
          } catch (e) {
            return select.value;
          }
        }
        
        const input = element.querySelector('input[data-field-path]');
        if (input) {
          return input.type === 'checkbox' ? input.checked : input.value;
        }
        
        const textarea = element.querySelector('textarea[data-field-path]');
        if (textarea) {
          return textarea.value;
        }
        
        return null;
      },
      
      // Set value in the custom form
      setValue: function(value) {
        const select = element.querySelector('select[data-field-path]');
        if (select) {
          // Find matching option
          const options = Array.from(select.options);
          for (let option of options) {
            try {
              const optionValue = option.value ? JSON.parse(option.value) : null;
              if (JSON.stringify(optionValue) === JSON.stringify(value)) {
                select.value = option.value;
                // Trigger change event
                select.dispatchEvent(new Event('change'));
                return;
              }
            } catch (e) {
              if (option.value === value) {
                select.value = option.value;
                select.dispatchEvent(new Event('change'));
                return;
              }
            }
          }
        }
        
        const input = element.querySelector('input[data-field-path]');
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = value;
          } else {
            input.value = value;
          }
          input.dispatchEvent(new Event('input'));
        }
        
        const textarea = element.querySelector('textarea[data-field-path]');
        if (textarea) {
          textarea.value = value;
          textarea.dispatchEvent(new Event('input'));
        }
      }
    };
    
    // Store the custom form instance
    this.customFormInstances.set(fieldPath, customForm);
    
    // Listen for custom-form-change events and handle them
    document.addEventListener('custom-form-change', (e) => {
      if (e.detail.fieldPath === fieldPath) {
        this.handleFieldChange(fieldPath, e.detail.value);
      }
    });
    
    return element;
  }

  /**
   * Handle field change - update document and send to collaboration
   */
  handleFieldChange(fieldPath, value) {
    // Don't process field changes during initial document load
    const isLoading = typeof window.isLoadingDocument === 'function' && window.isLoadingDocument();
    if (isLoading) {
      console.log('[FormGenerator] Ignoring field change during load: ' + fieldPath);
      return;
    }
    
    console.log('[FormGenerator] Field changed:', fieldPath, value);
    
    // Update the document
    if (typeof currentDocument !== 'undefined' && currentDocument) {
      const parts = fieldPath.split('.');
      let obj = currentDocument.data;
      
      // Navigate to the parent object
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) {
          obj[parts[i]] = {};
        }
        obj = obj[parts[i]];
      }
      
      // Set the value
      obj[parts[parts.length - 1]] = value;
      
      // Mark as modified (check if variable exists in global scope)
      if (typeof isModified !== 'undefined') {
        isModified = true;
      }
      
      // Send collaboration update if connected
      if (typeof window.collaborationClient !== 'undefined' && window.collaborationClient && window.collaborationClient.isConnected()) {
        const operation = {
          type: 'set',
          path: 'data.' + fieldPath,
          value: value
        };
        console.log('[FormGenerator] Sending collaboration update:', operation);
        window.collaborationClient.sendUpdate(operation);
      }
    }
  }

  /**
   * Generate complete form from schema structure
   */
  async generateForm(schemaProperties, documentData) {
    const form = document.createElement('div');
    form.className = 'document-form';

    for (const property of schemaProperties) {
      const value = documentData[property.name];
      const field = await this.generateField(property, value, property.name);
      form.appendChild(field);
    }

    return form;
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormGenerator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.FormGenerator = FormGenerator;
  module.exports.getInstance = () => new FormGenerator();
}
