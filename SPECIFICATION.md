# Specification

This is an ElectronJS based, cross platform, structured writing application to support the drafting of Module Descriptors.

The application MUST:
1. Support multiple document format types.
2. Ensure documents are compliant with their schemas and validate this on saving and loading.
3. have a graphical WYSIWYG interface.
4. Enforce a "structured writing" approach. The user is **not** creating documents of arbitrary format, the format is pre-defined by the document type schemas.
5. Sections of a document, as defined by the schema, should be added and removed via a clear UI action (e.g. a placeholder shoud appear where a valid section may be added.)
6. The document should be persisted to disk in a suitable "file format" (presumbably a JSON based one, this may require a further JSON-schema to be defined, but this should not be held in the `models` directory as it will be specific to the application, not the types of documents supported), that supports the holding of the "document contents" (which meet the JSON-schema for the document type) as well as any ancillary information needed for the application (e.g. such as comments, editing meta information, shared with users).
7. The application MUST allow the document to be saved in the JSON format, as defined by the document JSON-schema, without any of the other information that would be held in the "file format".
8. The application's code should not have any dependency on "magic" strings or behaviour that is "hard-coded" to particular values or names of sections in a document model. Anything that is dependent on this should be delegated to the model.
9. The application must be able to export the "clean" document (without an application metadata) that is compliant with the defined json-schema.
10. The application should offer the user to import a JSON file with *just* the model data into either an existing, currently open "document" of the matching type, or to create a "new" document of that type based on the provided data.

## Deployment

1. The Application will be deployed via:
 * installers
 * a portable format
2. The application should also be able to be run from a web server (similar to Github CodeSpaces or VS Code). In this case the persistence would be back to the originating web server, and this may require a separate webserver based back end to provide any necessary server-side processes.

## Configuration

1. Configuration of the application should be held in "user" space somewhere.
2. In addition to the models that ship with the program (in the `models` directory), allow for "userspace" models. These should be expected to live in a user specifiable directory.
3. It would be nice to follow *nix approaches to this, but this might not be feasible across all of the supported platform (i.e. a "." hidden directory in the user's home directory). Work out a feasible, consistent cross-platform approach to this.
4. By *default* the configuration has to hold user configuration information about / for use in the application, userspace templates (for rendering a document into an output format (like HTML)), userspace document models (for custom document types).
5. Custom document types (if they exist in the relevant location) should be automatically loaded in to the "New document" UI

## User Interface guidance

1. Should take cues from common word processor applications, such as Word.
2. A specific model for a document should be able to provide extra / custom form implementations to allow the editor to get user input for complex models.

### Markdown editor
1. Should support edit, preview and split modes.

#### UI Schematic: Edit mode

Note: [ ] Square brackets indicate a button.

|-----------------------------------------|
|  Editor area                            |
|-----------------------------------------|
           | [Edit] | [Preview] | [Split] |
           |------------------------------|

#### UI Schematic: Split mode

Note: [ ] Square brackets indicate a button.

|-----------------------|-----------------|
|  Editor area          | Preview area    |
|-----------------------|-----------------|
           | [Edit] | [Preview] | [Split] |
           |------------------------------|
## Output

1. Provide a preview of the markdown content, with a customisable rendering order.
2. Allow user to select a template to be used to render the content. This should be a markdown format file that accomodates placeholders for the various document elements, which will be renderered. These templates can be provided as part of the model in the `model\<name>\templates` directory, or they can also be loaded from a user template directory. The user template directory should be specifiable/changeable by the user to a different location.
3. Templates are not going to be able to specify the rendering of "custom forms", these should be rendered as they are just now. Where a custom-form based field is indicated for output this just shows the location of that content.
4. Fields can be outputted multiple times in a template.
5. If no template is selected as being active, then the output should simply follow the default renderingOrder of the preview.
6. If a template has been selected as being active, then the preview settings to re-order fields should not be displayed, as the preview will use the template file's information.
7. The "active" template is a *document* specific piece of data, so it should be held in the metadata of the document, not in the user configuration. This allows for the same template to be automatically re-selected when the document is re-opened. If the template is no longer available, then the rendering should fall back onto the default preview mode, with no active template. A notification that the template is no longer available/could not be found should be displayed as a transient notification.
8. HTML output should be ensured that it is as accessible as possible (ie. WCAG compliant).
9. Once export to HTML is supported, export to other formats such as Word (docx) and PDF formats should be supported, using the generated HTML as the basis for these formats. Each of these formats should be generated so that they are accessible as possible.

## Collaboration

1. The application should support multi-editor mode from the outset. When a user has a document open and they have allowed it to be shared (this may be via an email invite system, sharable URL with authentication code encoded, QR Code, or advertised for other instances of the application to find), other users of the application may join and make synchronous edits to the structure. The implementation must allow any user to make edits to any part of the document that is not being directly interacted with by another user.
2. Users external to the "host" of the document may hold different levels of access:
 * Readonly - Can only see the edits being made
 * Reviewer - Can see the edits, but can attach comments to the document or to sections.
 * Editor - Can modify the document alongside the host.

# Support multiple document format types

The `models` directory will contain JSON-Schemas that descript the structure and constraints of the types of documents that can be written.

Each sub-directory represents a single document type and it's schema.

The application should be a rich-text editor but the documents themselves will be JSON documents that comply with their corresponding schema.

## Schema definitions
Each document type in the `models` directory has the same structure.

The directory in `models` indicates the type of document, and primary file extension: `mdf`.

Within the directory may be a file named after the directory with the `.json` suffix, e.g. `mdf.json`.

This is a meta-data file that holds extra information about the document type, including:
* a description
* alternative file extensions
* `entrypoint` property, which indicates the starting json-schema file to describe the document's format. A file matching this property's value will be found in the `json-schema` sub-directory.

Within the directory is a sub-directory that will always be called `json-schema`. This will hold all of the relevant schemas in JSON-schema format that describe the documents structure.


