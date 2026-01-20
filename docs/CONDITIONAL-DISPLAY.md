# Conditional Display System

## Overview
The `conditionalDisplay` property in document type metadata files (e.g., `dpia.json`) controls whether fields/sections are displayed based on schema-defined conditional requirements.

## Data Structure

### Top-Level Structure
```json
{
  "conditionalDisplay": {
    "<fieldPath>": {
      "showWhen": "<condition>",
      "placeholder": {
        "message": "<text>",
        "style": "<style-type>"
      }
    }
  }
}
```

### Field Reference

#### `conditionalDisplay` (object)
Top-level property in document type metadata. Maps field paths to display rules.

#### `<fieldPath>` (string key)
The path to the field (e.g., `"fullDpia"`, `"screening.question1"`). Must match a property in the JSON schema.

#### `showWhen` (string)
Determines when the field should be visible:
- **`"required"`** - Show only when the field is conditionally required by schema rules
- **`"always"`** - Always show (default behavior if not specified)
- **`"never"`** - Never show (hide from UI entirely)

Future extensions could support:
- `"whenFilled"` - Show when any child field has data
- `"custom:expression"` - Custom JavaScript expression

#### `placeholder` (object)
Defines what to display when `showWhen` condition is **not met**.

##### `placeholder.message` (string)
The text message to display. Can include:
- Plain text
- Markdown formatting (if markdown support is enabled)
- Dynamic placeholders like `{fieldName}` (future enhancement)

##### `placeholder.style` (string)
Visual style for the placeholder:
- **`"info-box"`** - Informational box with info icon (blue/grey background)
- **`"warning-box"`** - Warning style with alert icon (yellow background)
- **`"subtle"`** - Minimal styling, light grey text
- **`"blank"`** - No visual indicator, just reserves space

## Example: DPIA Document Type

```json
{
  "description": "Data Protection Impact Assessment",
  "conditionalDisplay": {
    "fullDpia": {
      "showWhen": "required",
      "placeholder": {
        "message": "The full DPIA assessment will be displayed here once you answer 'Yes' to any screening question above.",
        "style": "info-box"
      }
    }
  }
}
```

### Behavior
1. **On document load**: If no screening questions are "Yes", `fullDpia` is hidden and placeholder shown
2. **When question changes to "Yes"**: Placeholder replaced with actual `fullDpia` form fields
3. **When all questions revert to "No"**: Form fields hidden, placeholder reappears

## Integration with Schema

The conditional display system works alongside JSON Schema's conditional validation:

**JSON Schema** (validation rules):
```json
{
  "anyOf": [
    {
      "if": { "properties": { "screening": { "properties": { "question1": { "const": "Yes" } } } } },
      "then": { "required": ["screening", "fullDpia"] }
    }
  ]
}
```

**Document Type Metadata** (UI display rules):
```json
{
  "conditionalDisplay": {
    "fullDpia": {
      "showWhen": "required",
      "placeholder": { ... }
    }
  }
}
```

## Implementation Notes

### Form Generator Changes
- Check `conditionalDisplay` during field rendering
- Evaluate current document state against schema conditionals
- Render placeholder or actual field based on requirements
- Re-evaluate on field changes (already handled by `updateConditionalFields()`)

### Placeholder Rendering
Create a placeholder element:
```html
<div class="conditional-placeholder info-box">
  <span class="placeholder-icon">ℹ️</span>
  <span class="placeholder-message">Message text here</span>
</div>
```

### CSS Styles
```css
.conditional-placeholder {
  padding: 20px;
  margin: 10px 0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.conditional-placeholder.info-box {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  color: #1565c0;
}

.conditional-placeholder.warning-box {
  background: #fff3e0;
  border: 1px solid #ffb74d;
  color: #e65100;
}

.conditional-placeholder.subtle {
  background: #f5f5f5;
  color: #757575;
  font-style: italic;
}
```

## Future Enhancements

1. **Custom Conditions**: Support JavaScript expressions in `showWhen`
2. **Animation**: Smooth transitions when toggling visibility
3. **Dynamic Messages**: Template variables in placeholder messages
4. **Nested Conditionals**: Apply to nested object properties
5. **Multiple Triggers**: Show when ANY or ALL of multiple conditions met
