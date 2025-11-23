# MDWriter User Manual

**Version 1.0**

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Interface Overview](#user-interface-overview)
4. [Working with Documents](#working-with-documents)
5. [Document Editing](#document-editing)
6. [Templates and Output](#templates-and-output)
7. [Collaboration](#collaboration)
8. [Configuration Reference](#configuration-reference)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is MDWriter?

MDWriter is a cross-platform structured writing application designed for creating and editing structured documents such as Module Descriptors. Unlike traditional word processors that allow free-form content, MDWriter enforces document structure based on predefined schemas, ensuring consistency and compliance with organizational standards.

### Key Features

- **Structured Writing**: Documents follow predefined schemas ensuring consistency
- **Multiple Document Types**: Support for various document formats (Module Descriptors, PR/FAQs, etc.)
- **WYSIWYG Interface**: Word processor-style interface for easy editing
- **Schema Validation**: Automatic validation ensures documents meet requirements
- **Template System**: Customizable output templates for HTML export
- **Real-time Collaboration**: Work together with colleagues on the same document
- **Cross-platform**: Works on Windows, macOS, and Linux

### System Requirements

- **Operating System**: Windows 10+, macOS 10.13+, or Linux (modern distributions)
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Disk Space**: 200MB for application + storage for documents
- **Network**: Required for collaboration features

---

## Getting Started

### First Launch

When you first launch MDWriter, you'll see the welcome screen with two options:

- **Create New Document**: Start a new document from scratch
- **Open Existing Document**: Open a previously saved document

### Creating Your First Document

1. Click **Create New Document** or use the **New** button in the toolbar
2. Select a document type from the list (e.g., "Module Descriptor")
   - Document types are organized by category (Academic, Technical, Product Management, etc.)
   - Use the search box to filter by name or category
3. The editor will load with a blank document structure
4. Fill in the required fields as indicated by the schema
5. Save your document using **File → Save** or the **Save** button

### Opening Existing Documents

1. Click **Open** in the toolbar or use **File → Open**
2. Navigate to your document file (`.mdf` extension)
3. Select the file and click **Open**
4. The document will load and validate against its schema

---

## User Interface Overview

### Main Window Layout

The MDWriter interface is divided into several key areas:

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar (New, Open, Save, Export, Collaborate)             │
├──────────┬────────────────────────────────┬─────────────────┤
│          │                                │                 │
│ Document │   Editor Area                  │  Properties     │
│ Structure│   (Form fields and content)    │  Panel          │
│ Sidebar  │                                │  - Validation   │
│          │                                │  - Metadata     │
│          │                                │  - Output       │
│          │                                │                 │
└──────────┴────────────────────────────────┴─────────────────┘
│ Status Bar                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Toolbar

Located at the top of the window, the toolbar provides quick access to common actions:

- **☰ (Menu)**: Toggle the document structure sidebar
- **New**: Create a new document
- **Open**: Open an existing document
- **Save**: Save the current document
- **Save As**: Save the document with a new name
- **Export JSON**: Export clean JSON (schema-only, no metadata)
- **Collaborate**: Start or join a collaboration session
- **⋮ (Properties)**: Toggle the properties panel

### Document Structure Sidebar

The left sidebar shows the hierarchical structure of your document:

- Click on any section to navigate to it in the editor
- Empty fields are indicated with a dimmed appearance
- When collaborating, you'll see cursor indicators showing where other users are working
- The **+ Add Section** button allows adding new sections (where permitted by the schema)

### Editor Area

The main central area where you edit document content:

- Form fields are generated automatically based on the document schema
- Required fields are marked with an asterisk (*)
- Markdown fields include a text editor with preview capabilities
- Custom editors appear for complex fields (e.g., assessment methods, reading lists)

### Properties Panel

The right panel contains three tabs:

#### Validation Tab
- Shows validation status (valid/invalid)
- Lists any validation errors with field references
- Updates automatically as you edit

#### Document Info Tab
- Displays document metadata:
  - Document type
  - Creation date
  - Last modified date
  - Version number

#### Output Tab
- **Template Selection**: Choose an output template
- **Preview Settings**: Customize field rendering order (when no template is active)
- **Document Preview**: Live preview of the rendered document
- **Export HTML**: Export the document to HTML format

---

## Working with Documents

### Creating a New Document

1. Click **New** in the toolbar
2. In the document type selector:
   - Browse categories or use the search box
   - Recently used types appear at the top for quick access
   - Select your desired document type
3. Click **Create** to open a blank document

### Saving Documents

#### Regular Save (`.mdf` format)

The `.mdf` format is MDWriter's native file format and includes:
- All document data
- Edit history
- Metadata (creation date, modification date, etc.)
- Active template selection
- Future: Comments and sharing information

**To save:**
1. Click **Save** in the toolbar (or **Ctrl+S** / **Cmd+S**)
2. Choose a location and filename
3. Click **Save**

#### Export to Clean JSON

Export creates a clean JSON file containing only the document data that matches the schema (no application metadata):

1. Click **Export JSON** in the toolbar
2. Choose a location and filename
3. The exported file can be shared with other systems or imported back into MDWriter

### Opening Documents

1. Click **Open** in the toolbar (or **Ctrl+O** / **Cmd+O**)
2. Navigate to your `.mdf` file
3. Click **Open**
4. The document will load and validate automatically

**Recent Files**: Access recently opened documents from the File menu for quick access.

### Importing JSON Data

You can import clean JSON data that matches a document schema:

1. With a document open (or create a new one of the matching type)
2. Use **File → Import JSON**
3. Select the JSON file
4. The data will populate into the current document

---

## Document Editing

### Understanding Document Structure

MDWriter enforces structured writing based on JSON schemas. This means:

- You cannot create arbitrary sections—only those defined in the schema
- Required fields must be filled before the document validates
- Field types determine input methods (text, textarea, markdown, custom editors)

### Field Types

#### Text Fields
Simple single-line text inputs for short content like titles, names, or IDs.

#### Textarea Fields
Multi-line text areas for longer content like descriptions or principles.

#### Markdown Fields

Markdown fields provide rich text editing capabilities with three view modes:

**Edit Mode**
- Raw markdown editing
- Syntax highlighting
- Direct text input

**Preview Mode**
- Rendered HTML preview
- Read-only view
- Shows final appearance

**Split Mode** (Default)
- Editor on the left
- Preview on the right
- Edit and preview simultaneously

**To switch modes:**
- Use the mode buttons at the bottom of the markdown editor: **[Edit] [Preview] [Split]**
- Your preferred mode is saved automatically

**Markdown Syntax:**
```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

- Bullet point
- Another point

1. Numbered list
2. Second item

[Link text](https://example.com)
```

#### Custom Form Fields

Some complex fields use specialized editors:

- **Learning Outcomes**: Add, edit, and organize learning outcomes
- **Staff**: Manage staff assignments with roles
- **Module Format**: Configure teaching hours and formats
- **Assessment Methods**: Define assessment components and weightings
- **Reading List**: Manage required and recommended readings

### Validation

MDWriter continuously validates your document:

- **Green checkmark**: Document is valid
- **Red X**: Validation errors exist
- Click the **Validation** tab in the properties panel to see specific errors
- Errors show the field name and what's wrong
- Documents with validation errors can be saved but may not export correctly

---

## Templates and Output

### Understanding Templates

Templates control how your document appears in the preview and HTML export:

- Templates are Markdown files with placeholders for document fields
- Placeholders are replaced with actual document content
- Fields can appear multiple times in different sections
- Templates provide professional, customized output

### Template Locations

Templates can be stored in two locations:

1. **Bundled Templates**: Included with document types in `models/<type>/templates/`
2. **User Templates**: Custom templates in your user templates directory

### Selecting a Template

1. Open the **Output** tab in the properties panel
2. Under "Template", select from the dropdown menu
3. The preview updates automatically
4. Your selection is saved with the document

**No Template Option**: When no template is selected, the preview uses the default field order.

### Customizing Template Directory

To use custom templates from a different location:

1. Go to **File → Preferences → Directories**
2. Click **Change** next to "Templates Directory"
3. Select your custom templates folder
4. Templates from this folder appear in the template dropdown

### Preview Settings

When no template is active, you can customize the preview:

1. Open the **Output** tab
2. In "Preview Settings", drag fields to reorder them
3. The preview updates as you reorder
4. Click **Reset to Default** to restore original order

**Note**: Preview settings are hidden when a template is active (the template controls the order).

### Fullscreen Preview

For a distraction-free view of your document:

1. Click the **⛶** (fullscreen) button in the Output tab
2. The preview expands to full window
3. Use **ESC** key or **Exit Fullscreen** button to close
4. The **Export HTML** button is available in fullscreen mode

### Exporting to HTML

1. Click **Export HTML** in the Output tab (or in fullscreen preview)
2. Choose a save location
3. The HTML file includes:
   - Formatted document content
   - CSS styling for readability
   - Accessibility features (WCAG compliant)

---

## Collaboration

### Overview

MDWriter supports real-time collaboration, allowing multiple users to edit the same document simultaneously.

### Starting a Collaboration Session (Host)

1. Open the document you want to share
2. Click **Collaborate** in the toolbar
3. Switch to the **Host Session** tab
4. Enter a session name (e.g., "MH101 Module Review")
5. Enter your name (so others know who you are)
6. Click **Start Hosting**
7. Your session is now discoverable on the local network

**Session Information**: Once hosting, you'll see:
- Session name and ID
- Your role (Host)
- List of connected users
- Session status

### Joining a Collaboration Session

1. Click **Collaborate** in the toolbar
2. Switch to the **Join Session** tab
3. Enter your name
4. The app automatically discovers available sessions on your network
5. Click on a session to join
6. You'll see the document and can start editing

**Auto-Discovery**: MDWriter uses mDNS (multicast DNS) to find sessions on your local network automatically.

### Working in a Collaborative Session

**Visual Indicators**:
- User cursors appear in the document structure sidebar
- Field highlights show where others are actively editing
- The collaboration status shows connected user count

**Editing Rules**:
- You can edit any field not currently being edited by another user
- Fields being edited by others are temporarily locked
- Changes sync in real-time across all connected users
- Your edits are instantly visible to all participants

**Best Practices**:
- Communicate with collaborators about who's working on what
- Use descriptive names so everyone knows who's who
- The host should coordinate major structural changes

### Leaving a Session

1. Click **Collaborate** in the toolbar
2. Switch to the **Active Session** tab
3. Click **Leave Session**

**For Hosts**: Ending your session will disconnect all participants.

---

## Configuration Reference

### Configuration File Location

MDWriter stores configuration in a platform-specific user data directory:

- **Windows**: `%APPDATA%\mdwriter\config.json`
- **macOS**: `~/Library/Application Support/mdwriter/config.json`
- **Linux**: `~/.config/mdwriter/config.json`

### Configuration Settings

#### General Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `version` | string | "1.0" | Configuration file version |

#### Userspace Settings

| Setting | Path | Type | Description |
|---------|------|------|-------------|
| Models Directory | `userspace.modelsDirectory` | string | Location for custom document types |
| Templates Directory | `userspace.templatesDirectory` | string | Location for custom output templates |

**Default Locations**:
- **Models**: `<userData>/models`
- **Templates**: `<userData>/templates`

**To Change**:
1. Go to **File → Preferences → Directories**
2. Click **Change** next to the directory you want to modify
3. Select the new location
4. Custom models/templates in the new location are loaded automatically

#### Preferences

| Setting | Path | Type | Default | Description |
|---------|------|------|---------|-------------|
| Auto Save | `preferences.autoSave` | boolean | false | Automatically save documents periodically |
| Auto Save Interval | `preferences.autoSaveInterval` | number | 30000 | Time between auto-saves (milliseconds) |
| Max Recent Files | `preferences.maxRecentFiles` | number | 10 | Number of recent files to remember |
| Markdown Editor View Mode | `preferences.markdownEditorViewMode` | string | "split" | Default markdown editor mode: "edit", "preview", or "split" |

**Recent Files**: Automatically tracked list of recently opened documents (up to max limit).

#### Collaboration Settings

| Setting | Path | Type | Default | Description |
|---------|------|------|---------|-------------|
| Default User Name | `collaboration.defaultUserName` | string | "" | Your default name for collaboration sessions |
| Auto Discovery | `collaboration.autoDiscovery` | boolean | true | Automatically discover collaboration sessions on the network |

### Accessing Preferences

**Via Menu**:
1. Go to **File → Preferences**
2. Modify settings as needed
3. Changes are saved automatically

**Via Configuration File**:
Advanced users can edit the `config.json` file directly (close MDWriter first):

```json
{
  "version": "1.0",
  "userspace": {
    "modelsDirectory": "C:\\Users\\YourName\\Documents\\MDWriter\\models",
    "templatesDirectory": "C:\\Users\\YourName\\Documents\\MDWriter\\templates"
  },
  "preferences": {
    "autoSave": false,
    "autoSaveInterval": 30000,
    "recentFiles": [],
    "maxRecentFiles": 10,
    "markdownEditorViewMode": "split"
  },
  "collaboration": {
    "defaultUserName": "Your Name",
    "autoDiscovery": true
  }
}
```

### Custom Document Types

To add custom document types:

1. Set your userspace models directory (see above)
2. Create a subdirectory named after your document type (e.g., `mytype`)
3. Inside that directory, create:
   - `mytype.json` (metadata file)
   - `json-schema/` directory containing your JSON schemas
4. Restart MDWriter
5. Your custom type appears in the "New Document" selector with "(Custom)" label

**Example Metadata File** (`mytype.json`):
```json
{
  "description": "My Custom Document",
  "category": "Custom",
  "icon": "📄",
  "extensions": ["mytype"],
  "entrypoint": "mytype.schema.json"
}
```

### Custom Templates

To add custom templates:

1. Set your userspace templates directory (see above)
2. Create a Markdown file with your template content
3. Use placeholders like `{{fieldname}}` for document fields
4. Save the file in your templates directory
5. Refresh templates in the Output tab
6. Your template appears in the dropdown

---

## Keyboard Shortcuts

### General

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` / `Cmd+N` | New document |
| `Ctrl+O` / `Cmd+O` | Open document |
| `Ctrl+S` / `Cmd+S` | Save document |
| `Ctrl+Shift+S` / `Cmd+Shift+S` | Save As |
| `Ctrl+E` / `Cmd+E` | Export JSON |
| `F11` | Toggle fullscreen |
| `ESC` | Exit fullscreen preview |

### Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `Ctrl+F` / `Cmd+F` | Find in current field |
| `Tab` | Move to next field |
| `Shift+Tab` | Move to previous field |

### Markdown Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` / `Cmd+B` | Bold selected text |
| `Ctrl+I` / `Cmd+I` | Italic selected text |
| `Ctrl+K` / `Cmd+K` | Insert link |
| `Ctrl+1-6` / `Cmd+1-6` | Insert heading (H1-H6) |

### Panels

| Shortcut | Action |
|----------|--------|
| `Ctrl+\` / `Cmd+\` | Toggle sidebar |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Toggle properties panel |
| `Ctrl+Shift+V` / `Cmd+Shift+V` | Switch to Validation tab |
| `Ctrl+Shift+M` / `Cmd+Shift+M` | Switch to Metadata tab |
| `Ctrl+Shift+O` / `Cmd+Shift+O` | Switch to Output tab |

---

## Troubleshooting

### Common Issues

#### "Document validation failed" error when opening

**Cause**: The document doesn't match its schema, possibly due to schema changes or corruption.

**Solution**:
1. Check the Validation tab for specific errors
2. Fix the errors in the editor
3. Save the document
4. If errors persist, export to JSON and re-import into a new document

#### Templates not appearing in dropdown

**Cause**: Templates directory not set or templates not in correct format.

**Solution**:
1. Check **File → Preferences → Directories** to verify templates directory
2. Ensure template files are Markdown (`.md`) format
3. Click **Refresh** button next to the template dropdown
4. Check that template files are directly in the templates directory (not in subdirectories)

#### "Template not found" notification

**Cause**: A document references a template that no longer exists.

**Solution**:
- The document automatically falls back to default preview mode
- Select a different template from the dropdown
- The notification disappears after 5 seconds

#### Cannot join collaboration session

**Cause**: Network configuration, firewall, or host not advertising properly.

**Solution**:
1. Ensure both computers are on the same local network
2. Check firewall settings (MDWriter needs ports 3000-3100)
3. Click **Refresh** in the Join Session tab
4. Verify the host has "Auto Discovery" enabled
5. Try hosting from the other computer

#### Custom document types not loading

**Cause**: Incorrect directory structure or metadata file format.

**Solution**:
1. Verify userspace models directory is set correctly
2. Check directory structure: `models/typename/typename.json` and `models/typename/json-schema/`
3. Validate JSON syntax in metadata file
4. Restart MDWriter after adding new types
5. Check console for error messages (Help → Developer Tools)

#### Changes not syncing in collaboration

**Cause**: Network interruption or connection lost.

**Solution**:
1. Check collaboration status indicator
2. Leave and rejoin the session
3. If hosting, restart the session
4. Check network connectivity

#### Markdown preview not updating

**Cause**: Preview mode not active or editor error.

**Solution**:
1. Switch to Split or Preview mode using mode buttons
2. Check that content is valid Markdown
3. Try switching modes (Edit → Preview → Split)
4. Reload the document

### Getting Help

If you encounter issues not covered here:

1. Check the GitHub issues page
2. Enable Developer Tools (**Help → Toggle Developer Tools**) to see console errors
3. Export your document to JSON as a backup
4. Contact support with:
   - MDWriter version number
   - Operating system and version
   - Steps to reproduce the issue
   - Any error messages from Developer Tools

### Performance Tips

- **Large documents**: Use collaboration sparingly on very large documents
- **Auto-save**: Disable if working with large files on slow storage
- **Preview**: Switch to Edit mode if preview rendering is slow
- **Custom forms**: Complex custom forms may take longer to load

---

## Appendix

### File Format Specifications

#### .mdf File Format (Native Format)

The `.mdf` file is a JSON file containing:

```json
{
  "metadata": {
    "type": "document-type-name",
    "created": "ISO-8601 timestamp",
    "modified": "ISO-8601 timestamp",
    "version": "1.0",
    "activeTemplate": "template-filename.md",
    "editHistory": []
  },
  "data": {
    // Document content matching the schema
  }
}
```

#### Exported JSON Format

Exported JSON contains only the `data` object, matching the document type's schema exactly.

### Supported Markdown Syntax

MDWriter supports GitHub Flavored Markdown (GFM):

- Headings (`# H1` through `###### H6`)
- Bold (`**bold**` or `__bold__`)
- Italic (`*italic*` or `_italic_`)
- Links (`[text](url)`)
- Images (`![alt](url)`)
- Lists (ordered and unordered)
- Code blocks (`` `inline` `` and ` ```fenced``` `)
- Blockquotes (`> quote`)
- Horizontal rules (`---`)
- Tables (GFM table syntax)

### Glossary

- **Schema**: A JSON Schema definition that describes document structure and validation rules
- **Document Type**: A category of document (e.g., Module Descriptor, PR/FAQ) with its own schema
- **Custom Form**: A specialized editor for complex fields beyond simple text input
- **Template**: A Markdown file with placeholders used to render document output
- **Userspace**: User-specific directories for custom models and templates
- **Validation**: The process of checking document data against its schema
- **Structured Writing**: An approach where document structure is predefined and enforced

---

**MDWriter User Manual v1.0**  
Last Updated: November 2025

For the latest version of this manual, visit: [GitHub Repository]
