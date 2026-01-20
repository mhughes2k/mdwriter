# Nested Objects Support in MDWriter

## Overview
MDWriter now supports nested object structures in JSON schemas, allowing for complex hierarchical document types like the DPIA (Data Protection Impact Assessment) with grouped sections of fields.

## What Changed

### 1. Schema Loader Enhancement
**File:** `src/main/schema-loader.js`

The `parseSchemaProperties` method now recursively processes nested objects:
- Detects when a property is of type `object` with its own `properties`
- Recursively parses nested properties to create a hierarchical structure
- Marks nested objects with `isNested: true` flag
- Supports field ordering within nested objects via `uiHints`

### 2. Form Generator Enhancement  
**File:** `src/renderer/form-generator.js`

Added support for rendering nested objects and enum dropdowns:

#### Nested Objects
- New `createNestedObjectInput()` method generates collapsible fieldsets
- Fieldsets have clickable headers with expand/collapse arrows
- Nested fields use dot notation for field paths (e.g., `screening.question1`)
- Recursive field generation maintains proper parent-child relationships

#### Enum Support
- New `createSelectInput()` method generates HTML `<select>` dropdowns
- Automatically handles enum values from schema
- Includes empty option for non-required fields
- Properly sets selected value on load

### 3. Styling Updates
**File:** `src/renderer/styles.css`

Added new styles for nested objects:
- `.nested-object-field` - Container for fieldset
- `.fieldset-header` - Clickable header with toggle arrow
- `.fieldset-content` - Collapsible content area
- `.field-select` - Dropdown styling consistent with other inputs
- Hover effects and smooth transitions for better UX

### 4. Document Type Metadata Enhancement
**File:** `src/main/schema-loader.js`

Added support for `category` and `icon` metadata fields:
- Document types can now specify a category for grouping (e.g., "Compliance", "Academic")
- Icon field supports emoji characters for visual identification
- Backward compatible - defaults to "Other" category and 📄 icon if not specified

## How to Use Nested Objects

### 1. Define Nested Structure in JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Example Document",
  "type": "object",
  "properties": {
    "screening": {
      "type": "object",
      "title": "Screening Questions",
      "description": "Initial screening questionnaire",
      "properties": {
        "question1": {
          "type": "string",
          "title": "Question 1",
          "description": "First question",
          "enum": ["Yes", "No"]
        },
        "question2": {
          "type": "string",
          "title": "Question 2", 
          "description": "Second question",
          "enum": ["Yes", "No"]
        }
      }
    }
  }
}
```

### 2. Add UI Hints in Document Type Metadata

```json
{
  "description": "Example Document Type",
  "category": "Compliance",
  "icon": "🔒",
  "extensions": ["example"],
  "entrypoint": "example.schema.json",
  "uiHints": {
    "screening": {
      "displayAs": "Screening Questionnaire",
      "displayType": "fieldset"
    }
  }
}
```

### 3. Field Path Convention

Fields within nested objects use dot notation:
- Top-level field: `title`
- Nested field: `screening.question1`
- Deeply nested: `section.subsection.field`

The document manager automatically creates nested objects as needed when saving values.

## Example: DPIA Document Type

The DPIA (Data Protection Impact Assessment) document type demonstrates nested object support:

```
DPIA Document
├── screening (nested object)
│   ├── question1 (enum: Yes/No)
│   ├── question2 (enum: Yes/No)
│   └── ... (13 screening questions)
└── fullDpia (nested object)
    ├── step1 (nested object)
    │   ├── projectAim (textarea)
    │   ├── processingType (textarea)
    │   └── ...
    ├── step2 (nested object)
    ├── step3 (nested object)
    └── ... (7 assessment steps)
```

## Features

### Collapsible Sections
- Click the fieldset header to expand/collapse sections
- Arrow indicator shows current state (▼ expanded, ▶ collapsed)
- Sections start expanded by default

### Enum Dropdowns
- Automatically rendered for string properties with `enum` array
- Shows "-- Select --" placeholder for optional fields
- Current value automatically selected on load

### Backward Compatibility
- Simple (flat) schemas continue to work as before
- No changes required to existing document types
- Nested support is opt-in via schema structure

## Implementation Notes

### Data Structure
The document data structure mirrors the schema hierarchy:

```javascript
{
  "screening": {
    "question1": "Yes",
    "question2": "No"
  },
  "fullDpia": {
    "step1": {
      "projectAim": "...",
      "processingType": "..."
    }
  }
}
```

### Field Updates
The existing `updateField` method in `document-manager.js` already supports dot notation and automatically creates nested objects as needed.

### Validation
JSON Schema validation works seamlessly with nested structures - no changes required to the validation system.

## Limitations

- Maximum practical nesting depth: 3-4 levels (for UX reasons)
- No support for arrays of nested objects within nested objects (yet)
- Field ordering within nested objects requires explicit `fieldOrder` in `uiHints`

## Future Enhancements

Potential improvements for nested object support:
1. Drag-and-drop to reorder sections
2. Conditional visibility (show/hide sections based on other field values)
3. Summary view showing only section headers
4. Keyboard shortcuts for expand/collapse all
5. Remember collapsed state in localStorage
