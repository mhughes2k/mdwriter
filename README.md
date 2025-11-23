# MDWriter

An ElectronJS-based, cross-platform structured writing application for drafting Module Descriptors.

## Features

✅ **Schema-Driven Document Creation** - Documents are validated against JSON schemas
✅ **Dynamic Form Generation** - UI fields automatically generated from schema properties
✅ **File Operations** - Open, save, and export documents with native file dialogs
✅ **Dual File Formats**:
  - Application format: JSON with metadata (comments, edit history, sharing info)
  - Export format: Clean JSON matching schema only
✅ **Document Validation** - Real-time validation against JSON schemas using Ajv
✅ **Multiple Document Types** - Extensible system supporting different document schemas
✅ **Structured Editing** - Add/remove sections and array items based on schema

## Installation

```powershell
npm install
```

## Running the Application

```powershell
npm start                # Development mode with DevTools
npm run build            # Build for current platform
npm run build:win        # Windows (NSIS installer + portable)
npm run build:mac        # macOS DMG
npm run build:linux      # Linux (AppImage + deb)
npm run dist             # Build for all platforms
```

## Project Structure

```
src/
  main/
    main.js              - Main process with IPC handlers
    schema-loader.js     - Loads and validates JSON schemas
    document-manager.js  - Document CRUD and validation
  preload/
    preload.js          - Secure IPC bridge
  renderer/
    index.html          - Main UI structure
    styles.css          - Application styling
    renderer.js         - UI logic and event handling
    form-generator.js   - Dynamic form generation from schemas
models/
  mdf/                  - Module Descriptor Format
    mdf.json           - Document type metadata
    json-schema/       - JSON schemas
```

## Usage

### Creating a New Document
1. Click "New" or "Create New Document"
2. Fill in the required fields (marked with *)
3. Use "+ Add" buttons to add array items (learning outcomes, assessments, etc.)
4. Save using "Save" or "Save As"

### Opening Documents
1. Click "Open" or "Open Existing Document"
2. Select an `.mdf`, `.module`, or `.json` file
3. Document will be validated on load

### Exporting
- **Save**: Saves in application format (with metadata)
- **Export JSON**: Exports clean JSON matching schema only (no metadata)

### Document Validation
- Automatic validation on save and load
- Validation errors shown in status bar
- Can save documents with validation errors (with confirmation)

## Adding New Document Types

1. Create a directory in `models/<type-name>/`
2. Add `<type-name>.json` with metadata:
```json
{
  "description": "Document Type Description",
  "extensions": ["ext1", "ext2"],
  "entrypoint": "main-schema.schema.json"
}
```
3. Add JSON schemas in `models/<type-name>/json-schema/`
4. Restart application - new type will be auto-detected

## Architecture

### Security Model
- Context isolation enabled
- Node integration disabled in renderer
- IPC bridge via contextBridge (no direct Node API access)

### Schema System
- JSON schemas define document structure
- Schemas support `$ref` for complex nested types
- Ajv validator with async schema loading
- Schema properties drive UI generation

### File Formats
- **Application Format** (`.mdf`): 
  ```json
  {
    "metadata": { ... },
    "data": { ... }
  }
  ```
- **Export Format**: Clean JSON matching schema

## Future Enhancements

- [ ] Multi-user collaboration (infrastructure ready)
- [ ] Comments and annotations
- [ ] Rich text editing in text fields
- [ ] Web server deployment mode
- [ ] Auto-save and version history
- [ ] Custom validation rules
- [ ] Template system

## License

ISC
