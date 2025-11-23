# MDWriter - AI Coding Instructions

## Project Overview
MDWriter is an **ElectronJS-based, cross-platform structured writing application** for drafting Module Descriptors. It enforces structured document formats using JSON schemas and provides a WYSIWYG interface for creating compliant documents.

## Technology Stack
- **Framework**: Electron v28 (vanilla JavaScript, no framework)
- **Build Tool**: electron-builder (for installers and portable builds)
- **Target Platforms**: Windows (NSIS + portable), macOS (DMG), Linux (AppImage + deb)
- **UI**: Pure HTML/CSS/JavaScript with Word processor-inspired interface

### Node
- Remember to load the **LTS** version of node via NPM prior to running any npm related commands. NVM is not always set up correctly due to the impact on shell configuration resolution time in VSCode. 

## Project Structure
```
src/
  main/main.js          - Main process: window management, IPC handlers, file operations
  main/schema-loader.js - Dynamic document type loader and schema resolver
  main/document-manager.js - Document CRUD operations and validation
  preload/preload.js    - Secure IPC bridge via contextBridge (no node APIs exposed)
  renderer/
    index.html          - Main UI structure (toolbar, sidebar, editor, properties panel)
    styles.css          - Word processor-style interface styling
    renderer.js         - Renderer logic for document editing, type selection
    form-generator.js   - Schema-driven form generation
models/
  <type>/               - Each document type in separate directory
    <type>.json         - Metadata (category, icon, extensions, entrypoint)
    json-schema/        - JSON schemas defining document structure
    forms/              - Optional custom form editors (advanced fields)
docs/
  DOCUMENT-TYPES.md     - Guide for adding new document types
  SCHEMA-DRIVEN-ARCHITECTURE.md - Core architectural principles
```

## Architecture Principles

### Multi-Document Type System
- **Extensible**: Add new types without code changes - just add `models/<type>/` directory
- **Searchable UI**: Category-based list with search/filter (scales to 50+ types)
- **Recently Used**: Tracks last 5 document types in localStorage
- Each type has: `category`, `icon` (emoji), `description`, `extensions`, `entrypoint` schema
- Dynamic file dialogs: Build filters from registered document types at runtime
- See `docs/DOCUMENT-TYPES.md` for complete guide

### Document Type Metadata (`<type>.json`)
Required fields:
- `description` - Human-readable name shown in UI
- `category` - Group name (Academic, Product Management, Technical, etc.)
- `icon` - Single emoji character for visual identification
- `extensions` - Array of file extensions for save/open dialogs
- `entrypoint` - Main JSON schema filename

Optional fields:
- `fieldOrder` - Custom property display order
- `uiHints` - Field labels and input types
- `customForms` - Advanced editors for complex fields

### File Format vs Export Format
- **File format**: Custom JSON with document data + app metadata (comments, edit history, sharing info)
- **Export format**: Clean JSON matching only the document type's JSON schema
- Both formats stored as `.mdf` files but serve different purposes (editing vs sharing)

### Structured Writing Enforcement
- Users cannot create arbitrary content - only schema-defined sections
- Sections added/removed via explicit UI actions (placeholders indicate valid insertion points)
- Schema validation runs on save/load operations
- UI dynamically adapts to schema structure

### Schema-Driven Architecture (CRITICAL)
**NO MAGIC STRINGS**: Application code must NEVER hard-code field names or document-specific logic.
- ❌ BAD: `if (fieldName === 'description' || fieldName === 'syllabus')`
- ✅ GOOD: `if (property.format === 'textarea')`
- All UI behavior delegated to schema properties (`format`, `type`, `x-display-type`, etc.)
- Form generator works generically for ANY document type
- See `docs/SCHEMA-DRIVEN-ARCHITECTURE.md` for detailed guidelines

### Collaboration (Future)
- IPC events already defined: `document-update`, `user-joined`, `user-left`
- Multi-editor mode with role-based access (readonly, reviewer, editor)
- Locking mechanism to prevent concurrent edits of same section

## Development Workflow
- You should ensure that you use resources like Google web searches to ensure that you have a feasible approach before suggesting code.

### Running the Application
```powershell
npm install              # Install dependencies
npm start                # Run in development mode
npm run build            # Build for current platform
npm run build:win        # Build Windows (NSIS + portable)
npm run dist             # Build for all platforms
```

### Key IPC Handlers (in main.js)
- `load-document` - Load document from file path
- `save-document` - Save document to file path
- `validate-document` - Validate against JSON schema

### Security Model
- Context isolation enabled
- Node integration disabled in renderer
- Only whitelisted APIs exposed via `window.electronAPI`

## Critical Implementation Details

### Schema Loading Pattern
When implementing schema operations:
1. Read `models/<type>/<type>.json` for metadata
2. Use `entrypoint` to find main schema in `models/<type>/json-schema/`
3. Load referenced schemas using `$ref` resolution
4. Validate document structure before save/load

### UI State Management
- `currentDocument` holds active document data
- `documentType` determined from document metadata or user selection
- Status bar updates provide user feedback for all operations
- Recently used types tracked in localStorage for quick access

## Adding New Document Types

**Zero code changes required** - follow this pattern:

1. Create `models/newtype/newtype.json`:
```json
{
  "description": "Display Name",
  "category": "Category Name",
  "icon": "📋",
  "extensions": ["ext"],
  "entrypoint": "newtype.schema.json"
}
```

2. Create `models/newtype/json-schema/newtype.schema.json` (JSON Schema Draft 7)

3. Restart app - type appears automatically in categorized list

4. Users can search/filter by name, category, or extension

**Example document types:** MDF (Module Descriptor), PR/FAQ (Product Planning)

## Next Implementation Priorities
1. **Custom form editors** - Build specialized UIs for complex array/object types
2. **Collaboration features** - Multi-user editing with role-based access
3. **Export templates** - Custom output formats (PDF, Markdown, etc.)
4. **Version control** - Track document changes and allow rollback

## Reference Files
- `SPECIFICATION.md` - Full requirements and architecture decisions
- `docs/DOCUMENT-TYPES.md` - Guide for adding new document types
- `docs/SCHEMA-DRIVEN-ARCHITECTURE.md` - Core architectural principles
- `models/mdf/json-schema/module-descriptor.schema.json` - Example MDF schema
- `models/prfaq/json-schema/prfaq.schema.json` - Example PR/FAQ schema
- `src/main/main.js` - All IPC handler implementations
