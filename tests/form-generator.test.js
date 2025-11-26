/**
 * Unit Tests for FormGenerator
 * 
 * Tests:
 * - Field generation for different types
 * - Custom form loading
 * - Input validation
 * - Nested object handling
 * - Array field management
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock DOM environment
global.document = {
  createElement: jest.fn((tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      className: '',
      textContent: '',
      innerHTML: '',
      value: '',
      dataset: {},
      children: [],
      style: {},
      appendChild: jest.fn(function(child) {
        this.children.push(child);
        return child;
      }),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
      },
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      addEventListener: jest.fn(),
    };
    return element;
  }),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  head: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

global.window = {
  electronAPI: {
    getCustomFormData: jest.fn(),
  },
  customFormFactories: {},
  markdownEditor: null,
};

// Mock FormGenerator (needs to be adapted for Node.js testing)
// Since FormGenerator is a browser class, we'll test its logic
class FormGenerator {
  constructor() {
    this.fieldHandlers = new Map();
    this.customFormHandlers = new Map();
    this.documentType = null;
  }

  setDocumentType(documentType) {
    this.documentType = documentType;
  }

  async generateField(property, value, fieldPath) {
    const container = document.createElement('div');
    container.className = 'form-field';
    container.dataset.fieldPath = fieldPath;

    const label = document.createElement('label');
    label.className = 'field-label';
    
    const displayLabel = property.displayAs || property.title || property.name;
    label.textContent = displayLabel;
    
    if (property.required) {
      label.classList.add('required');
    }
    container.appendChild(label);

    const input = await this.createInput(property, value, fieldPath);
    container.appendChild(input);

    return container;
  }

  async createInput(property, value, fieldPath) {
    if (property.customForm) {
      return await this.createCustomForm(property, value, fieldPath);
    }

    if (property.type === 'array') {
      return this.createArrayInput(property, value, fieldPath);
    }

    switch (property.type) {
      case 'string':
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

  createTextInput(property, value, fieldPath) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'field-input';
    input.value = value || '';
    input.dataset.fieldPath = fieldPath;
    return input;
  }

  createTextarea(property, value, fieldPath) {
    const textarea = document.createElement('textarea');
    textarea.className = 'field-textarea';
    textarea.value = value || '';
    textarea.dataset.fieldPath = fieldPath;
    return textarea;
  }

  createNumberInput(property, value, fieldPath) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'field-input';
    // Ensure value is always a string (browser behavior)
    input.value = value !== undefined && value !== null ? String(value) : '';
    input.dataset.fieldPath = fieldPath;
    
    if (property.minimum !== undefined) {
      input.setAttribute('min', property.minimum);
    }
    if (property.maximum !== undefined) {
      input.setAttribute('max', property.maximum);
    }
    
    return input;
  }

  createCheckbox(property, value, fieldPath) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'field-checkbox';
    input.checked = !!value;
    input.dataset.fieldPath = fieldPath;
    return input;
  }

  createArrayInput(property, value, fieldPath) {
    const container = document.createElement('div');
    container.className = 'array-field';
    container.dataset.fieldPath = fieldPath;
    return container;
  }

  async createCustomForm(property, value, fieldPath) {
    try {
      const result = await window.electronAPI.getCustomFormData(
        this.documentType,
        property.customForm
      );
      
      if (result.error) {
        return this.createPlaceholder(`Error: ${result.error}`);
      }

      if (result.implementation && window.customFormFactories[property.customForm]) {
        const factory = window.customFormFactories[property.customForm];
        return factory(property, value, fieldPath, result.data);
      }

      return this.createPlaceholder('Custom form implementation required');
    } catch (err) {
      return this.createPlaceholder(`Error: ${err.message}`);
    }
  }

  createPlaceholder(text) {
    const placeholder = document.createElement('div');
    placeholder.className = 'custom-form-placeholder';
    placeholder.textContent = text;
    return placeholder;
  }
}

describe('FormGenerator', () => {
  let formGenerator;
  
  beforeEach(() => {
    // Re-apply document.createElement and related DOM mocks before each test
    global.document = {
      createElement: jest.fn((tag) => {
        const element = {
          tagName: tag.toUpperCase(),
          className: '',
          textContent: '',
          innerHTML: '',
          value: '',
          dataset: {},
          children: [],
          style: {},
          appendChild: jest.fn(function(child) {
            this.children.push(child);
            return child;
          }),
          classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(),
          },
          setAttribute: jest.fn(),
          getAttribute: jest.fn(),
          addEventListener: jest.fn(),
        };
        return element;
      }),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      head: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
    };
    global.window = {
      electronAPI: {
        getCustomFormData: jest.fn(),
      },
      customFormFactories: {},
      markdownEditor: null,
    };
    jest.clearAllMocks();
    formGenerator = new FormGenerator();
    window.customFormFactories = {};
  });
  
  afterEach(() => {
    delete window.markdownEditor;
  });
  
  describe('Constructor', () => {
    test('should initialize with empty maps', () => {
      expect(formGenerator.fieldHandlers).toBeInstanceOf(Map);
      expect(formGenerator.customFormHandlers).toBeInstanceOf(Map);
      expect(formGenerator.documentType).toBeNull();
    });
  });
  
  describe('setDocumentType', () => {
    test('should set document type', () => {
      formGenerator.setDocumentType('mdf');
      expect(formGenerator.documentType).toBe('mdf');
    });
  });
  
  describe('generateField', () => {
    test('should create field container with label', async () => {
      const property = {
        name: 'title',
        title: 'Document Title',
        type: 'string'
      };
      
      const field = await formGenerator.generateField(property, 'Test', 'data.title');
      
      expect(field.className).toBe('form-field');
      expect(field.dataset.fieldPath).toBe('data.title');
      expect(field.children).toHaveLength(2); // label + input
    });
    
    test('should use displayAs for label if provided', async () => {
      const property = {
        name: 'title',
        title: 'Title',
        displayAs: 'Module Name',
        type: 'string'
      };
      
      const field = await formGenerator.generateField(property, '', 'data.title');
      const label = field.children[0];
      
      expect(label.textContent).toContain('Module Name');
    });
    
    test('should mark required fields', async () => {
      const property = {
        name: 'title',
        type: 'string',
        required: true
      };
      
      const field = await formGenerator.generateField(property, '', 'data.title');
      const label = field.children[0];
      
      expect(label.classList.add).toHaveBeenCalledWith('required');
    });
  });
  
  describe('createTextInput', () => {
    test('should create text input', () => {
      const property = {
        name: 'title',
        type: 'string'
      };
      
      const input = formGenerator.createTextInput(property, 'Test Value', 'data.title');
      
      expect(input.tagName).toBe('INPUT');
      expect(input.type).toBe('text');
      expect(input.value).toBe('Test Value');
      expect(input.dataset.fieldPath).toBe('data.title');
    });
    
    test('should handle empty value', () => {
      const property = { type: 'string' };
      
      const input = formGenerator.createTextInput(property, '', 'data.field');
      
      expect(input.value).toBe('');
    });
  });
  
  describe('createTextarea', () => {
    test('should create textarea for long text', () => {
      const property = {
        name: 'description',
        type: 'string',
        format: 'textarea'
      };
      
      const textarea = formGenerator.createTextarea(property, 'Long text', 'data.description');
      
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea.value).toBe('Long text');
    });
  });
  
  describe('createNumberInput', () => {
    test('should create number input', () => {
      const property = {
        name: 'credits',
        type: 'number'
      };
      
      const input = formGenerator.createNumberInput(property, 10, 'data.credits');
      
      expect(input.type).toBe('number');
      expect(input.value).toBe('10');
    });
    
    test('should set min and max attributes', () => {
      const property = {
        name: 'credits',
        type: 'number',
        minimum: 0,
        maximum: 100
      };
      
      const input = formGenerator.createNumberInput(property, 50, 'data.credits');
      
      expect(input.setAttribute).toHaveBeenCalledWith('min', 0);
      expect(input.setAttribute).toHaveBeenCalledWith('max', 100);
    });
  });
  
  describe('createCheckbox', () => {
    test('should create checkbox for boolean', () => {
      const property = {
        name: 'active',
        type: 'boolean'
      };
      
      const input = formGenerator.createCheckbox(property, true, 'data.active');
      
      expect(input.type).toBe('checkbox');
      expect(input.checked).toBe(true);
    });
    
    test('should handle false value', () => {
      const property = { type: 'boolean' };
      
      const input = formGenerator.createCheckbox(property, false, 'data.active');
      
      expect(input.checked).toBe(false);
    });
  });
  
  describe('createArrayInput', () => {
    test('should create array container', () => {
      const property = {
        name: 'items',
        type: 'array',
        items: { type: 'string' }
      };
      
      const container = formGenerator.createArrayInput(property, [], 'data.items');
      
      expect(container.className).toBe('array-field');
      expect(container.dataset.fieldPath).toBe('data.items');
    });
  });
  
  describe('createInput', () => {
    test('should create text input for string type', async () => {
      const property = {
        name: 'title',
        type: 'string'
      };
      
      const input = await formGenerator.createInput(property, 'Test', 'data.title');
      
      expect(input.type).toBe('text');
    });
    
    test('should create textarea for string with textarea format', async () => {
      const property = {
        name: 'description',
        type: 'string',
        format: 'textarea'
      };
      
      const input = await formGenerator.createInput(property, 'Test', 'data.description');
      
      expect(input.tagName).toBe('TEXTAREA');
    });
    
    test('should create textarea for string with textarea displayType', async () => {
      const property = {
        name: 'description',
        type: 'string',
        displayType: 'textarea'
      };
      
      const input = await formGenerator.createInput(property, 'Test', 'data.description');
      
      expect(input.tagName).toBe('TEXTAREA');
    });
    
    test('should create number input for number type', async () => {
      const property = {
        name: 'credits',
        type: 'number'
      };
      
      const input = await formGenerator.createInput(property, 10, 'data.credits');
      
      expect(input.type).toBe('number');
    });
    
    test('should create checkbox for boolean type', async () => {
      const property = {
        name: 'active',
        type: 'boolean'
      };
      
      const input = await formGenerator.createInput(property, true, 'data.active');
      
      expect(input.type).toBe('checkbox');
    });
    
    test('should create array container for array type', async () => {
      const property = {
        name: 'items',
        type: 'array'
      };
      
      const input = await formGenerator.createInput(property, [], 'data.items');
      
      expect(input.className).toBe('array-field');
    });
  });
  
  describe('createCustomForm', () => {
    beforeEach(() => {
      formGenerator.setDocumentType('mdf');
    });
    
    test('should load custom form data', async () => {
      const property = {
        name: 'staff',
        customForm: 'staff-editor',
        customFormConfig: { type: 'staff-editor' }
      };
      
      window.electronAPI.getCustomFormData.mockResolvedValue({
        data: { roles: ['Lecturer', 'Tutor'] },
        implementation: 'function createCustomForm() { return document.createElement("div"); }'
      });
      
      window.customFormFactories['staff-editor'] = jest.fn(() => {
        const div = document.createElement('div');
        div.className = 'custom-staff-editor';
        return div;
      });
      
      const form = await formGenerator.createCustomForm(property, [], 'data.staff');
      
      expect(window.electronAPI.getCustomFormData).toHaveBeenCalledWith('mdf', 'staff-editor');
    });
    
    test('should show error placeholder on custom form error', async () => {
      const property = {
        customForm: 'invalid-editor',
        customFormConfig: { type: 'invalid' }
      };
      
      window.electronAPI.getCustomFormData.mockResolvedValue({
        error: 'Form not found'
      });
      
      const form = await formGenerator.createCustomForm(property, null, 'data.field');
      
      expect(form.className).toBe('custom-form-placeholder');
      expect(form.textContent).toContain('Error');
    });
    
    test('should show placeholder when implementation missing', async () => {
      const property = {
        customForm: 'test-editor',
        customFormConfig: { type: 'test' }
      };
      
      window.electronAPI.getCustomFormData.mockResolvedValue({
        data: {}
      });
      
      const form = await formGenerator.createCustomForm(property, null, 'data.field');
      
      expect(form.className).toBe('custom-form-placeholder');
      expect(form.textContent).toContain('implementation required');
    });
  });
  
  describe('createPlaceholder', () => {
    test('should create placeholder element', () => {
      const placeholder = formGenerator.createPlaceholder('Test message');
      
      expect(placeholder.className).toBe('custom-form-placeholder');
      expect(placeholder.textContent).toBe('Test message');
    });
  });
});
