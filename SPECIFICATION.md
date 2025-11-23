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

## Deployment

1. The Application will be deployed via:
 * installers
 * a portable format
2. The application should also be able to be run from a web server (similar to Github CodeSpaces or VS Code). In this case the persistence would be back to the originating web server, and this may require a separate webserver based back end to provide any necessary server-side processes. **This requirement should be designed for but not implemented yet.**

## User Interface guidance

1. Should take cues from common word processor applications, such as Word.
2. A specific model for a document should be able to provide extra / custom form implementations to allow the editor to get user input for complex models.

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


