# Schema-Driven Architecture: Avoiding Magic Strings

## Principle
**Requirement #8**: The application's code should not have any dependency on "magic" strings or behaviour that is "hard-coded" to particular values or names of sections in a document model. Anything that is dependent on this should be delegated to the model.

## Problem Example (BEFORE)

### ❌ Violation in form-generator.js
```javascript
// BAD: Hard-coded field names specific to MDF model
if (property.format === 'textarea' || property.name.includes('description') || 
    property.name.includes('syllabus') || property.name.includes('aim')) {
  return this.createTextarea(property, value, fieldPath);
}
```

**Issues:**
- Application code "knows" about MDF-specific fields (`description`, `syllabus`, `aim`)
- Won't work correctly for other document types
- Fragile - breaks if schema field names change
- Violates separation of concerns

## Solution (AFTER)

### ✅ Schema-Driven Approach with Separation of Concerns

**1. In form-generator.js:**
```javascript
// GOOD: Use UI hints from metadata, not field names
if (property.displayType === 'textarea' || property.format === 'textarea') {
  return this.createTextarea(property, value, fieldPath);
}
```

**2. In mdf.json (application-specific UI metadata):**
```json
{
  "description": "Module Descriptor Schema",
  "extensions": ["mdf", "module"],
  "entrypoint": "module-descriptor-full.schema.json",
  "uiHints": {
    "description": {
      "displayType": "textarea"
    },
    "syllabus": {
      "displayType": "textarea"
    }
  }
}
```

**3. In module-descriptor-full.schema.json (pure validation schema):**
```json
{
  "description": {
    "description": "A description of the module",
    "type": "string"
  },
  "syllabus": {
    "description": "The syllabus for the module",
    "type": "string"
  }
}
```

## Benefits

1. **Reusability**: Form generator works with ANY document type
2. **Maintainability**: UI behavior defined in metadata, not scattered in code
3. **Extensibility**: Add new document types without changing application code
4. **Single Source of Truth**: Schema controls validation, metadata controls presentation
5. **Separation of Concerns**: JSON Schema for validation, mdf.json for UI hints

## Architecture: Two-File System

### `<type>.json` - Document Type Metadata (Application-Specific)
Contains UI presentation hints and application configuration:
- `description`: Human-readable description
- `extensions`: File extensions for this document type
- `entrypoint`: Main schema file name
- `uiHints`: Field-specific UI presentation (displayType, widget, placeholder, etc.)

### `json-schema/*.schema.json` - Validation Schema (Pure JSON Schema)
Contains only validation rules:
- Standard JSON Schema properties (`type`, `required`, `minimum`, etc.)
- No application-specific UI hints
- Portable - can be used by other tools for validation

## UI Hints Reference

Define in `<type>.json` under `uiHints`:

```json
{
  "uiHints": {
    "fieldName": {
      "displayType": "textarea",      // UI widget type
      "widget": "rich-text-editor",   // Custom widget identifier
      "placeholder": "Enter text...",  // Placeholder text
      "helpText": "Additional info"    // Help text for users
    }
  }
}
```

### Supported displayType Values
- `"textarea"`: Multi-line text input
- `"email"`: Email input with validation
- `"date"`: Date picker
- `"time"`: Time picker
- Custom types as needed

## Schema Extension Points

### In JSON Schema Files (Validation Only)
- `type`: "string", "number", "boolean", "array", "object"
- `format`: Standard JSON Schema formats ("email", "uri", "date-time")
- `minimum`/`maximum`: Number constraints
- `pattern`: Regex validation
- `enum`: Allowed values
- `required`: Required fields array

### In Metadata Files (UI Only)
- All UI presentation in `uiHints` object
- No validation logic in metadata
- Application-specific configuration

## Guideline for Future Development

**Before adding code like:**
```javascript
if (fieldName === 'someSpecificField') {
  // special handling
}
```

**Ask:**
1. Is this logic specific to ONE document type?
2. Could this be expressed in the schema instead?
3. Will this work for future document types?

**If yes to #1 or no to #2/#3, move the logic to the schema!**

## Implementation Checklist

When adding new features:
- [ ] No hard-coded field names in application code
- [ ] UI behavior driven by schema properties
- [ ] Works for all document types, not just MDF
- [ ] Schema changes don't require code changes
- [ ] Custom widgets registered generically, not by field name
