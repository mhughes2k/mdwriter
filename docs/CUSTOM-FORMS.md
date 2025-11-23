# Custom Forms Extension System

## Overview
The form generator can be extended with custom UI widgets defined in document type model directories. This allows document types to provide specialized input interfaces beyond the standard form fields.

## Architecture

### Three-Part System:

1. **Metadata Declaration** (`<type>.json`) - Declares which fields use custom forms and where to find the implementation
2. **Data Source** (`<type>/<data>.json`) - Provides data for the custom form
3. **Form Implementation** (`<type>/forms/<name>.js`) - Custom renderer loaded dynamically

**Key Principle**: The form generator has ZERO knowledge of custom form types. All implementations are loaded from model directories at runtime.

## Example: Level Selector

### 1. Metadata Declaration (`mdf.json`)

```json
{
  "uiHints": {
    "level": {
      "customForm": "level-selector"
    }
  },
  "customForms": {
    "level-selector": {
      "type": "level-selector",
      "dataSource": "scqf_levels.json",
      "implementation": "forms/level-selector.js"
    }
  }
}
```

**Properties:**
- `customForm`: Name of the custom form configuration
- `type`: Form type identifier (for documentation/debugging)
- `dataSource`: JSON file containing form data (relative to model directory)
- `implementation`: JavaScript file containing the form renderer (relative to model directory)

### 2. Data Source (`scqf_levels.json`)

```json
{
  "schema": "json-schema/levels.schema.json",
  "description": "SCQF levels and equivalencies",
  "levels": [
    {
      "scqflevel": 9,
      "sqaqualification": "...",
      "qheiqualification": "Bachelors/Ordinary Degree",
      "apprenticeshipsvqlevel": "..."
    }
  ]
}
```

**Properties:**
- `schema`: Reference to validation schema (for documentation)
- `description`: Human-readable description
- `levels`: (or any property name) Array of data objects

### 3. Form Implementation (`forms/level-selector.js`)

Must expose a `createCustomForm` function that returns a DOM element:

```javascript
/**
 * @param {Object} property - Schema property definition
 * @param {Object} value - Current field value
 * @param {String} fieldPath - Path to field in document
 * @param {Object} data - Data loaded from dataSource
 * @returns {HTMLElement} - The custom form DOM element
 */
function createCustomForm(property, value, fieldPath, data) {
  const levels = data.levels || data;
  
  const container = document.createElement('div');
  container.className = 'custom-form level-selector-form';
  
  const selector = document.createElement('select');
  selector.className = 'level-selector field-input';
  selector.dataset.fieldPath = fieldPath;
  
  // Build UI...
  
  // Dispatch custom-form-change event when value changes
  selector.addEventListener('change', (e) => {
    if (e.target.value) {
      const selectedLevel = JSON.parse(e.target.value);
      const event = new CustomEvent('custom-form-change', {
        detail: { fieldPath, value: selectedLevel }
      });
      document.dispatchEvent(event);
    }
  });
  
  return container;
}
```

**Required:**
- Function named `createCustomForm`
- Returns HTMLElement
- Dispatches `custom-form-change` event with `{ fieldPath, value }` on changes

## Built-in Custom Form Types

**None.** The form generator has no built-in custom form types. All custom forms must be implemented in the model directory.

## Creating Custom Forms

All custom forms are implemented in the model directory. The form generator loads and executes them at runtime.

### Implementation Template

Create `models/<type>/forms/<form-name>.js`:

```javascript
/**
 * Custom form implementation
 * 
 * @param {Object} property - Schema property with title, description, required, etc.
 * @param {*} value - Current value of the field
 * @param {String} fieldPath - Dot-notation path to field (e.g., "level" or "items[0].name")
 * @param {Object} data - Data loaded from the dataSource file
 * @returns {HTMLElement} - DOM element to render in the form
 */
function createCustomForm(property, value, fieldPath, data) {
  // 1. Create container
  const container = document.createElement('div');
  container.className = 'custom-form my-custom-form';
  container.dataset.fieldPath = fieldPath;
  
  // 2. Build your UI (inputs, selects, etc.)
  const input = document.createElement('select');
  input.className = 'field-input';
  input.dataset.fieldPath = fieldPath;
  
  // Populate from data
  data.items.forEach(item => {
    const option = document.createElement('option');
    option.value = JSON.stringify(item);
    option.textContent = item.label;
    if (value && value.id === item.id) {
      option.selected = true;
    }
    input.appendChild(option);
  });
  
  container.appendChild(input);
  
  // 3. Dispatch custom-form-change event on value changes
  input.addEventListener('change', (e) => {
    const newValue = JSON.parse(e.target.value);
    const event = new CustomEvent('custom-form-change', {
      detail: { fieldPath, value: newValue }
    });
    document.dispatchEvent(event);
  });
  
  // 4. Return the DOM element
  return container;
}
```

**Critical Requirements:**
1. **Function name must be `createCustomForm`**
2. **Must return HTMLElement**
3. **Must dispatch `custom-form-change` event** with `{ fieldPath, value }`
4. **No external dependencies** - only browser DOM APIs

## Events

### `custom-form-change`
Dispatched when custom form value changes.

```javascript
document.addEventListener('custom-form-change', (e) => {
  const { fieldPath, value } = e.detail;
  // Handle update
});
```

**Detail Properties:**
- `fieldPath`: Field path in document
- `value`: New value object

## Data Flow

1. Schema loader reads `customForms` from `<type>.json`
2. Properties annotated with `customForm` and `customFormConfig`
3. Form generator detects custom form in `createInput()`
4. IPC call `get-custom-form-data` loads:
   - Data from `dataSource` file
   - Implementation code from `implementation` file
5. Implementation executed in sandbox via `new Function()`
6. `createCustomForm()` called with property, value, fieldPath, data
7. Returned DOM element inserted into form
8. User interaction dispatches `custom-form-change` event
9. Document updated via standard field update mechanism

## Security Note

Custom form implementations are executed using `new Function()` in the renderer process. This is safe because:
- Code comes from local model directories (trusted source)
- No network access
- Sandboxed to renderer process (no Node.js APIs)
- Only has access to browser DOM APIs and provided parameters

## Best Practices

1. **Keep validation in schema** - Custom forms are for UI only
2. **Store reference data separately** - Don't embed in `<type>.json`
3. **Link to schema** - Include `schema` property in data files
4. **Dispatch standard events** - Use `custom-form-change` for consistency
5. **Namespace form types** - Use descriptive names like `level-selector`
6. **Document data format** - Add clear comments in data source files

## Benefits

- ✅ **Model-specific UI** - Each document type can provide custom interfaces
- ✅ **No application changes** - Add custom forms without modifying core code
- ✅ **Reusable** - Forms can be shared across document types
- ✅ **Data-driven** - Reference data lives with the model, not in code
- ✅ **Maintainable** - Clear separation between validation and presentation
