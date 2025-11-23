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
-[] A "close" document option is required. This should close the current document (including checking for any persistence) and re-establish the window as if it was opening for the first time.