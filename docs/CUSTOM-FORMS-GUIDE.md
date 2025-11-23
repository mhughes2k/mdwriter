# Custom Forms Development Guide

## Overview
Custom forms provide specialized UI controls for complex data types in MDWriter. They replace the default array/object rendering with purpose-built interfaces.

## Key Principle: Avoid Re-rendering on User Input

**CRITICAL**: Never call your main render function from input event handlers. Re-rendering the entire form recreates all DOM elements, causing the focused input to lose focus and interrupting the user's typing.

### ❌ INCORRECT Pattern (Causes Focus Loss)
```javascript
nameInput.addEventListener('input', (e) => {
  item.name = e.target.value;
  renderItems(); // BAD: Re-renders everything, loses focus
  dispatchChange();
});
```

### ✅ CORRECT Pattern (Preserves Focus)
```javascript
nameInput.addEventListener('input', (e) => {
  item.name = e.target.value;
  dispatchChange(); // GOOD: Only dispatches the change
});
```

## When Re-rendering is Acceptable

Only call your render function when the **structure** changes (not the data):
- Adding a new item
- Removing an item
- Actions triggered by buttons (not text inputs)

## Updating Calculated Values Without Re-rendering

If you need to update a calculated value (like totals), create a separate update function:

### Example: Format Editor (Hours Total)
```javascript
function renderFormats() {
  // Build the entire UI
  formats.forEach((format, index) => {
    const hoursInput = document.createElement('input');
    hoursInput.addEventListener('input', (e) => {
      format.hours = parseFloat(e.target.value) || 0;
      updateTotal(); // Updates only the total cell
      dispatchChange();
    });
  });
  
  // Add total row with data attribute for targeting
  const totalCell = document.createElement('td');
  totalCell.dataset.totalCell = 'true';
  totalCell.textContent = calculateTotal();
}

function updateTotal() {
  const totalCell = tbody.querySelector('[data-total-cell]');
  if (totalCell) {
    totalCell.textContent = calculateTotal();
  }
}
```

### Example: Assessment Methods (Weighting Total)
```javascript
function renderMethods() {
  // Build cards...
  updateTotalWeighting(); // Add total at end
}

function updateTotalWeighting() {
  // Remove existing total
  const existingTotal = listContainer.querySelector('.total-weighting');
  if (existingTotal) existingTotal.remove();
  
  // Add new total
  const totalCard = document.createElement('div');
  totalCard.className = 'total-weighting';
  totalCard.textContent = `Total: ${calculateTotal()}%`;
  listContainer.appendChild(totalCard);
}

// In input handler:
weightInput.addEventListener('input', (e) => {
  method.weighting = parseFloat(e.target.value) || 0;
  updateTotalWeighting(); // Only updates total display
  dispatchChange();
});
```

## Custom Form Structure

### Required Function Signature
```javascript
function createCustomForm(property, value, fieldPath, data) {
  // property: Schema property definition
  // value: Current field value (array/object)
  // fieldPath: Path to field in document
  // data: Optional external data from dataSource
  
  const container = document.createElement('div');
  container.className = 'custom-form your-form-name';
  container.dataset.fieldPath = fieldPath;
  
  // Build your UI...
  
  return container;
}
```

### Dispatching Changes
Always dispatch changes when data is modified:
```javascript
function dispatchChange() {
  const event = new CustomEvent('custom-form-change', {
    detail: { fieldPath, value: yourData }
  });
  document.dispatchEvent(event);
}
```

## Best Practices

### 1. Use Data Attributes for Targeting
```javascript
// During render:
totalCell.dataset.totalCell = 'true';

// During update:
const totalCell = container.querySelector('[data-total-cell]');
```

### 2. Separate Render from Update
```javascript
function renderItems() {
  // Full UI generation - only call on structural changes
}

function updateCalculatedValue() {
  // Targeted DOM updates - safe to call on input
}
```

### 3. Store References to Frequently Updated Elements
```javascript
let totalElement = null;

function renderItems() {
  // ...
  totalElement = document.createElement('div');
  totalElement.className = 'total';
  container.appendChild(totalElement);
  updateTotal();
}

function updateTotal() {
  if (totalElement) {
    totalElement.textContent = calculateTotal();
  }
}
```

## Common Patterns

### Array of Objects Editor
```javascript
function createCustomForm(property, value, fieldPath, data) {
  const items = Array.isArray(value) ? value : [];
  const container = document.createElement('div');
  const listContainer = document.createElement('div');
  container.appendChild(listContainer);

  function renderItems() {
    listContainer.innerHTML = '';
    items.forEach((item, index) => {
      const card = createItemCard(item, index);
      listContainer.appendChild(card);
    });
  }

  function createItemCard(item, index) {
    const card = document.createElement('div');
    
    // Text inputs - no re-render needed
    const input = document.createElement('input');
    input.value = item.name || '';
    input.addEventListener('input', (e) => {
      item.name = e.target.value;
      dispatchChange(); // No re-render!
    });
    card.appendChild(input);
    
    // Remove button - re-render acceptable
    const removeBtn = document.createElement('button');
    removeBtn.addEventListener('click', () => {
      items.splice(index, 1);
      renderItems(); // OK: structural change
      dispatchChange();
    });
    card.appendChild(removeBtn);
    
    return card;
  }

  const addButton = document.createElement('button');
  addButton.addEventListener('click', () => {
    items.push({ name: '' });
    renderItems(); // OK: structural change
    dispatchChange();
  });
  container.appendChild(addButton);

  renderItems();
  return container;
}
```

## Testing for Focus Loss

1. Load a document with your custom form
2. Click into a text input field
3. Start typing continuously
4. If typing is interrupted or the cursor jumps, you have a focus loss bug
5. Check if any `input` event handlers are calling render functions

## Registering Custom Forms

In your model's JSON file (e.g., `mdf.json`):

```json
{
  "uiHints": {
    "myfield": {
      "displayAs": "My Field",
      "customForm": "my-custom-form"
    }
  },
  "customForms": {
    "my-custom-form": {
      "type": "my-custom-form",
      "dataSource": "optional-data.json",
      "implementation": "forms/my-custom-form.js"
    }
  }
}
```

## Summary Checklist

- ✅ Only call render functions on structural changes (add/remove items)
- ✅ Use separate update functions for calculated values
- ✅ Use data attributes to target specific DOM elements
- ✅ Always dispatch changes with `custom-form-change` event
- ✅ Test by typing continuously in all text inputs
- ❌ Never call render functions from `input` event handlers
- ❌ Never recreate DOM elements that users are actively editing
