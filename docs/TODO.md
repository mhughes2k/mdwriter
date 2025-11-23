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
- [] A "close" document option is required. This should close the current document (including checking for any persistence) and re-establish the window as if it was opening for the first time.

## Deployment
- [] Build installers for Windows, macOS, Linux
- [] Create portable format builds
- [] Web server deployment mode (similar to GitHub CodeSpaces/VS Code)
  - [] Server-side persistence backend
  - [] Web-based client interface

## Configuration & User Space
- [] User configuration storage in cross-platform location
- [] Userspace models support (custom document types in user-specified directory)
- [] Userspace templates directory (customizable location)
- [] Auto-load custom document types from userspace into "New document" UI
- [] Configuration file for user preferences and settings

## Templates & Output
- [x] Markdown preview with customizable rendering order
- [] Template system for document rendering
  - [] Support templates in `models/<type>/templates` directory
  - [] Support user template directory (user-specifiable location)
  - [] Markdown templates with placeholders for document elements
  - [] Multiple field output support in templates
  - [] Hide field reordering UI when template is active
  - [] Custom form field rendering in templates
- [] Template selection UI
- [] Export using selected template

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