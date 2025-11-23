# Markdown Support in MDWriter

MDWriter provides comprehensive Markdown support for all text input fields, allowing rich formatting while maintaining structured document schemas.

## Features

### ✏️ Individual Field Editing
Every text input and textarea automatically supports Markdown with three viewing modes:

1. **Edit Mode** - Raw Markdown editing
2. **Preview Mode** - Live rendered preview
3. **Split Mode** - Edit and preview side-by-side

### 👁️ Document Preview
The Output panel provides a complete rendered preview of your document:
- Full Markdown rendering
- Customizable field order
- HTML export capability

## Using Markdown in Fields

### Edit Modes

Click the mode buttons above any text field:
- **✏️ Edit** - Write Markdown syntax
- **👁️ Preview** - See rendered output
- **⚡ Split** - Edit and preview simultaneously

### Supported Markdown Syntax

#### Text Formatting
```markdown
**bold text**
*italic text*
***bold and italic***
~~strikethrough~~
`inline code`
```

#### Headers
```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

#### Lists
```markdown
- Unordered list item
- Another item
  - Nested item

1. Ordered list item
2. Another item
   1. Nested item
```

#### Links and Images
```markdown
[Link text](https://example.com)
[Link with title](https://example.com "Title")
![Image alt text](image-url.jpg)
```

#### Tables
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

**Result:**
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

#### Code Blocks
````markdown
```javascript
function example() {
  return "Hello World";
}
```
````

#### Blockquotes
```markdown
> This is a blockquote
> It can span multiple lines
>
> And multiple paragraphs
```

#### Horizontal Rules
```markdown
---
***
___
```

## Document Preview Panel

### Accessing the Preview

1. Click the **Output** tab in the right panel
2. The preview updates automatically when you switch to this tab

### Features

#### Field Ordering
The preview respects your custom field order:

1. **Default Order**: Uses `fieldOrder` from document type metadata
2. **Custom Order**: Drag fields in the "Preview Settings" section to reorder
3. **Persistent**: Custom order saved in document metadata as `renderOrder`

#### Reordering Fields

1. Go to Output tab → Preview Settings
2. Drag fields using the ☰ handle
3. New order applies immediately to preview
4. Click "Reset to Default" to restore original order

#### Export to HTML

Click "Export HTML" to save a standalone HTML file with:
- Full Markdown rendering
- Embedded CSS styling
- No dependencies
- Shareable with anyone

## Document Type Configuration

### Default Field Order

In your document type's metadata file (`models/<type>/<type>.json`):

```json
{
  "fieldOrder": [
    "title",
    "description",
    "problem",
    "solution"
  ]
}
```

This determines:
1. Form field display order in editor
2. Default preview rendering order

### Display Labels

Customize how fields appear:

```json
{
  "uiHints": {
    "problem": {
      "displayAs": "Problem Statement",
      "displayType": "textarea"
    },
    "solution": {
      "displayAs": "Proposed Solution",
      "displayType": "textarea"
    }
  }
}
```

## Metadata Structure

### renderOrder Property

Custom field orders are stored in document metadata:

```json
{
  "metadata": {
    "version": "1.0",
    "documentType": "prfaq",
    "renderOrder": [
      "title",
      "subtitle",
      "problem",
      "solution",
      "customerQuote"
    ]
  }
}
```

- `null` or missing = use default `fieldOrder`
- Array = custom order for preview rendering only
- Does not affect editing form order

## Technical Details

### Markdown Parser

MDWriter uses [marked.js](https://marked.js.org/) with:
- GitHub Flavored Markdown (GFM)
- Tables support
- Smart line breaks
- Smart quotes and typography

### Security

- HTML in Markdown is rendered (be careful with user input)
- External images load if online
- Links open in external browser

### Performance

- **Edit mode**: No rendering overhead
- **Preview mode**: 300ms debounce on updates
- **Split mode**: Live updates as you type
- **Document preview**: Renders on-demand when tab opens

## Best Practices

### When to Use Markdown

✅ **Good for:**
- Long-form content (descriptions, problem statements)
- Documentation with formatting needs
- Content with lists, tables, or code examples
- Material that may be exported/shared

❌ **Not needed for:**
- Short identifiers (IDs, version numbers)
- Single-line titles
- Structured data (dates, numbers)

### Preview Workflow

1. **While editing**: Use split mode for complex formatting
2. **Quick check**: Toggle to preview mode briefly
3. **Final review**: Use Output tab for full document view
4. **Export**: Generate HTML when sharing outside MDWriter

### Field Ordering Strategy

#### Default Order (fieldOrder)
- Logical editing sequence
- Most important fields first
- Group related fields together

#### Custom Order (renderOrder)
- Reader-focused presentation
- Executive summary first
- Supporting details later

**Example:**
```
Editing Order:        Preview Order:
1. title             1. title
2. product           2. heading
3. heading           3. subtitle
4. subtitle          4. problem
5. problem           5. solution
6. solution          6. customerQuote
7. customerQuote     7. product (metadata)
```

## Keyboard Shortcuts

While in Markdown editor:
- `Tab` - Insert tab/indent (in textarea)
- `Shift+Tab` - Outdent
- `Ctrl/Cmd+B` - (Future) Bold selection
- `Ctrl/Cmd+I` - (Future) Italic selection

## Troubleshooting

### Preview Not Rendering

**Problem**: Preview shows "Loading Markdown renderer..."

**Solution**: 
1. Check that `marked` dependency is installed
2. Refresh the application
3. Check browser console for errors

### Tables Not Formatting

**Problem**: Table syntax not rendering correctly

**Solution**:
- Ensure proper pipe `|` alignment
- Include header separator row
- Check for consistent column counts

**Example:**
```markdown
| Name | Age |
|------|-----|
| John | 30  |
```

### Custom Order Not Saving

**Problem**: Field reordering resets after reload

**Solution**:
1. Ensure document is saved after reordering
2. Check document metadata has `renderOrder` array
3. Verify no validation errors preventing save

## Future Enhancements

Planned features:
- [ ] Markdown toolbar with formatting buttons
- [ ] Keyboard shortcuts for formatting
- [ ] Template snippets for tables
- [ ] PDF export
- [ ] Collaborative editing with live preview sync
- [ ] Spell check integration
- [ ] Word count for Markdown fields

## Related Documentation

- `DOCUMENT-TYPES.md` - Creating document types
- `SCHEMA-DRIVEN-ARCHITECTURE.md` - Core architecture
- `CUSTOM-FORMS-GUIDE.md` - Advanced field editors
