# MDWriter - AI Coding Instructions

## Project Overview
MDWriter is an **ElectronJS-based, cross-platform structured writing application** for drafting Module Descriptors. It enforces structured document formats using JSON schemas and provides a WYSIWYG interface for creating compliant documents.

## Technology Stack
- **Framework**: Electron v28 (vanilla JavaScript, no framework)
- **Build Tool**: electron-builder (for installers and portable builds)
- **Target Platforms**: Windows (NSIS + portable), macOS (DMG), Linux (AppImage + deb)
- **UI**: Pure HTML/CSS/JavaScript with Word processor-inspired interface

## Project Structure
```
src/
  main/main.js          - Main process: window management, IPC handlers, file operations
  preload/preload.js    - Secure IPC bridge via contextBridge (no node APIs exposed)
  renderer/
    index.html          - Main UI structure (toolbar, sidebar, editor, properties panel)
    styles.css          - Word processor-style interface styling
    renderer.js         - Renderer logic for document editing
models/
  mdf/                  - Module Descriptor Format document type
    json-schema/        - JSON schemas defining document structure
    mdf.json            - Metadata (description, extensions, entrypoint schema)
```

## Architecture Principles

### Document Type System
- Each document type lives in `models/<type>/` with metadata file `<type>.json`
- Metadata includes: `description`, `extensions` array, `entrypoint` (schema filename)
- JSON schemas in `models/<type>/json-schema/` define the document structure
- Application reads schemas at runtime to enforce structure and validation

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
- `documentType` determines which schema to use (currently hardcoded to 'mdf')
- Status bar updates provide user feedback for all operations

## Next Implementation Priorities
1. **File dialogs** - Implement native open/save dialogs for document operations
2. **Schema validation** - Add JSON schema validator library (e.g., Ajv)
3. **Dynamic section UI** - Generate form fields from schema properties
4. **Export functionality** - Strip app metadata for clean JSON export

## Reference Files
- `SPECIFICATION.md` - Full requirements and architecture decisions
- `models/mdf/json-schema/module-descriptor-full.schema.json` - Primary MDF schema
- `src/main/main.js` - All IPC handler stubs to implement
