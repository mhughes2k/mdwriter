# TODO List

- [x] Loading and saving progress indicators.
- [x] Override schema field labels in <model>.json file:
    ```
    mdf.json now has " displayAs" attribute for each uiHint, this should be used as the relevant form's label over the the schema's value. The schema value should be displayed in "()" following the displayAs value (wrap it in a tag to allow us to format the display of the schema label later)
    ```
- [x] Validation should not display a success (or failure) if there is no loaded file.

- [x] Custom form elements for:
    - [x] learningoutcomes
    - [x] Staff
    - [x] Format
    - [x] assessmentmethods
    - [x] resit methods
    - [x] reading list

- [x] "format" control doesn't update the total hours when a row is updated, added or removed.
- [x] Default the export json file to the same as the "full" json file, but with JSON extension.
- [x] Button visibility improvements (Export HTML, Reset to Default, etc.) - fixed contrast issues
- [x] Collaboration features:
    - [x] Real-time document synchronization
    - [x] User presence indicators on fields
    - [x] Cursor tracking in document structure sidebar
    - [x] Custom form cursor tracking support
    - [x] Bidirectional cursor updates (host and client)
- [x] Document structure sidebar improvements:
    - [x] Show all schema fields (including empty ones)
    - [x] Visual indicator for empty fields
    - [x] Click to navigate and send cursor updates
- [x] Cancel dialog spinner fix (loading indicator now properly hidden on cancel)
- [x] A "close" document option is required. This should close the current document (including checking for any persistence) and re-establish the window as if it was opening for the first time.
- [x] Dirty state tracking with visual indicator
- [] User interface around a "toolbar" is inconsistent, and should be updated with some sort of framework type mechanism to allow for easier management of toolbar items. 
- [] User interface menus are somewhat lacking.

## File Format & Persistence
- [x] Basic .mdf file format with document data and metadata
- [x] Edit history tracking in metadata
- [] Comments support in file format
- [] Shared with users information in file format
- [x] Export to clean JSON (schema-only, no metadata)
- [] Clear documentation of .mdf format vs export JSON format
- [] Import of clean JSON into:
    - [] New Document
    - [] Existing document

## Deployment
- [] Build installers for Windows, macOS, Linux
- [] Create portable format builds
- [] Web server deployment mode (similar to GitHub CodeSpaces/VS Code)
  - [] Server-side persistence backend
  - [] Web-based client interface

## Configuration & User Space
- [x] User configuration storage in cross-platform location
- [x] Userspace models support (custom document types in user-specified directory)
  - [x] User-specifiable directory location for userspace models
- [x] Userspace templates directory (customizable location)
- [x] Auto-load custom document types from userspace into "New document" UI
- [x] Configuration file for user preferences and settings
- [x] Markdown editor view mode preference (edit/preview/split)

## Templates & Output
- [x] Markdown preview with customizable rendering order
- [x] Document preview fullscreen mode
- [x] Template system for document rendering
  - [x] Support templates in `models/<type>/templates` directory
  - [x] Support user template directory (user-specifiable location)
  - [x] Markdown templates with placeholders for document elements
  - [x] Multiple field output support in templates
  - [x] Hide field reordering UI when template is active
  - [x] Custom form field rendering in templates
- [x] Template selection UI
- [x] Export using selected template
- [x] Active template persistence
  - [x] Store active template in document metadata (not user config)
  - [x] Template fallback when unavailable with transient notification
- [] Export formats
  - [x] HTML export
  - [] WCAG compliant/accessible HTML output
  - [] Word (docx) export (using generated HTML as basis)
  - [] PDF export (using generated HTML as basis)

## Collaboration (Advanced Features)
- [x] Basic multi-editor support with real-time sync
- [] Collaboration modes:
  - [x] Editor mode (full editing)
  - [] Readonly mode (view only)
  - [] Reviewer mode (view + comments)
- [] Session sharing mechanisms:
  - [x] Local network discovery (mDNS)
  - [] Email invite system
  - [] Shareable URL with authentication code
  - [] QR Code sharing
- [] Document locking (prevent concurrent edits on same section)
- [] Comment system for reviewers
- [] User access level management

## Schema & Document Types
- [x] Multiple document type support
- [x] JSON Schema validation on save/load
- [x] Schema-driven UI generation
- [] Alternative file extensions support (from metadata)
- [] Userspace document models integration
- [] Section placeholder UI (visual indicators for where sections can be added)