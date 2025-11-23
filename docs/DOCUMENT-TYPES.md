# Document Type System

MDWriter supports multiple structured document types through a schema-driven architecture. This document explains how to add new document types and customize the user experience.

## Overview

Each document type is defined by:
1. **Metadata file** (`<type>/<type>.json`) - Configuration and UI hints
2. **JSON Schema** (`<type>/json-schema/`) - Document structure and validation
3. **Custom Forms** (optional) - Specialized editors for complex fields

## Document Type Selection

When creating a new document, users see a **searchable categorized list** with:
- ✅ **Search/filter** - Find types by name, description, or extensions
- ✅ **Categories** - Organized groups (Academic, Product Management, etc.)
- ✅ **Recently used** - Quick access to frequently used types
- ✅ **Keyboard navigation** - Enter to select, Escape to cancel
- ✅ **Visual icons** - Emoji icons for quick recognition

## Adding a New Document Type

### 1. Create Directory Structure

```
models/
  yourtype/
    yourtype.json           # Metadata
    json-schema/
      yourtype.schema.json  # Main schema
    forms/                  # Optional custom editors
```

### 2. Define Metadata (`yourtype.json`)

```json
{
  "description": "Human-readable document type name",
  "category": "Category Name",
  "icon": "📋",
  "extensions": ["ext1", "ext2"],
  "entrypoint": "yourtype.schema.json",
  "fieldOrder": ["field1", "field2"],
  "uiHints": {
    "field1": {
      "displayAs": "Field Label",
      "displayType": "textarea"
    }
  }
}
```

**Required fields:**
- `description` - Shown in document type selector
- `category` - Groups related types (e.g., "Academic", "Product Management")
- `icon` - Emoji shown in selector (use single emoji character)
- `extensions` - File extensions for save dialogs
- `entrypoint` - Main JSON schema filename

**Optional fields:**
- `fieldOrder` - Display order for properties
- `uiHints` - Custom labels and input types
- `customForms` - Advanced editors (see Custom Forms Guide)

### 3. Create JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://mdwriter.app/schemas/yourtype",
  "title": "Your Document Type",
  "description": "Description of the document",
  "type": "object",
  "properties": {
    "field1": {
      "description": "Field description",
      "type": "string"
    }
  },
  "required": ["field1"]
}
```

### 4. Test Your Document Type

1. Restart MDWriter
2. Click "New Document"
3. Your type should appear in the correct category
4. Test search functionality
5. Verify schema validation works

## Categories

Organize document types by category for better discoverability:

### Existing Categories
- **Academic** - Educational content (Module Descriptors, Course Proposals)
- **Product Management** - Product planning (PR/FAQ, Product Briefs)

### Adding New Categories

Simply set the `category` field in your document type metadata. Categories are automatically created and alphabetically sorted.

**Best Practices:**
- Use 1-3 word category names
- Keep categories broad (3-10 types per category)
- Be consistent across related types

## Icons

Use emoji for visual recognition. Choose icons that represent the document's purpose:

| Type | Icon | Meaning |
|------|------|---------|
| Academic | 📘 | Book/learning |
| Product | 📄 | Document |
| Technical | 🔧 | Engineering |
| Design | 🎨 | Creative |
| Business | 💼 | Professional |
| Research | 🔬 | Scientific |

**Fallback:** If no icon specified, defaults to 📝

## Search Functionality

The search box filters by:
- Document type name
- Description text
- File extensions

**Search is case-insensitive** and matches partial strings.

Example: Searching "module" finds "Module Descriptor" and ".module" extensions.

## Recently Used Tracking

The system automatically tracks the 5 most recently created document types and displays them in a "Recently Used" category at the top of the list.

**Storage:** Uses browser localStorage (persists between sessions)

**Limit:** Last 5 types only

## File Format Conventions

### Internal Format (`.mdf`, `.prfaq`, etc.)
Contains:
- Document data
- Application metadata (created date, version, etc.)
- Edit history
- Collaboration data (future)

### Export Format (`.json`)
Clean JSON matching only the schema structure - suitable for sharing/integration.

## Schema-Driven Architecture

**CRITICAL:** All UI behavior must be driven by schema properties, not hardcoded field names.

❌ **Bad:**
```javascript
if (fieldName === 'description') {
  // Special handling
}
```

✅ **Good:**
```javascript
if (property.format === 'textarea') {
  // Use schema format property
}
```

See `docs/SCHEMA-DRIVEN-ARCHITECTURE.md` for detailed guidelines.

## Scaling Considerations

The searchable list interface scales well:
- ✅ **2-10 types** - Excellent (current use case)
- ✅ **10-50 types** - Good (search becomes essential)
- ✅ **50+ types** - Acceptable (consider sub-categories)

For 100+ types, consider:
- Adding tag-based filtering
- Type templates/cloning
- Favorites system

## Example: Creating a "Technical Spec" Type

```bash
# 1. Create structure
mkdir -p models/techspec/json-schema

# 2. Create metadata
cat > models/techspec/techspec.json << 'EOF'
{
  "description": "Technical Specification Document",
  "category": "Technical",
  "icon": "🔧",
  "extensions": ["techspec", "spec"],
  "entrypoint": "techspec.schema.json"
}
EOF

# 3. Create schema
cat > models/techspec/json-schema/techspec.schema.json << 'EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Technical Specification",
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "version": { "type": "string" },
    "overview": { "type": "string" }
  },
  "required": ["title", "version"]
}
EOF

# 4. Restart app - new type appears automatically!
```

## Troubleshooting

**Type doesn't appear in list:**
- Check `models/<type>/<type>.json` exists
- Verify JSON is valid
- Check console for schema loading errors
- Restart application

**Search doesn't find type:**
- Verify description and name match search terms
- Check category spelling

**Wrong icon displayed:**
- Ensure icon field contains single emoji character
- Check for UTF-8 encoding

## Related Documentation

- `SCHEMA-DRIVEN-ARCHITECTURE.md` - Core architectural principles
- `CUSTOM-FORMS-GUIDE.md` - Building specialized editors
- `TODO.md` - Planned document type features
