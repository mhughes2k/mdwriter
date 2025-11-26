/**
 * Custom Form: Module Code Editor
 *
 * Provides a small form for editing the `moduleCode` object used in the
 * `mdf` document type. The object shape is { code: string, status: string }.
 *
 * Exports:
 * - createCustomForm(property, value, fieldPath, data)
 * - renderForDisplay(value)
 */

function createCustomForm(property, value, fieldPath, data) {
  const current = (value && typeof value === 'object') ? { ...value } : { code: '', status: 'proposed' };

  const container = document.createElement('div');
  container.className = 'custom-form module-code-editor';
  container.dataset.fieldPath = fieldPath;

  // Code field
  const codeLabel = document.createElement('label');
  codeLabel.textContent = (property && property.title) ? property.title : 'Module Code';
  container.appendChild(codeLabel);

  const codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.className = 'field-input module-code-input';
  codeInput.value = current.code || '';
  codeInput.placeholder = 'E.g. CS101 or MATH2001';
  // Enforce pattern from schema: ^[A-Z]{2,4}[0-9]{3,4}[A-Z]?$
  codeInput.pattern = '^[A-Z]{2,4}[0-9]{3,4}[A-Z]?$';
  codeInput.autocapitalize = 'characters';
  container.appendChild(codeInput);

  const codeError = document.createElement('div');
  codeError.className = 'field-error';
  codeError.style.display = 'none';
  codeError.textContent = 'Module code must match pattern: 2–4 letters then 3–4 digits, optional trailing letter.';
  container.appendChild(codeError);

  // Status field
  const statusLabel = document.createElement('label');
  statusLabel.textContent = 'Status';
  container.appendChild(statusLabel);

  const statusSelect = document.createElement('select');
  statusSelect.className = 'field-input module-code-status';
  const statuses = ['proposed', 'issued', 'retired'];
  for (const s of statuses) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    if (current.status === s) opt.selected = true;
    statusSelect.appendChild(opt);
  }
  container.appendChild(statusSelect);

  function validateAndDispatch() {
    const codeVal = (codeInput.value || '').trim().toUpperCase();
    // Simple pattern test
    const pattern = new RegExp(codeInput.pattern);
    const ok = pattern.test(codeVal);

    if (!ok && codeVal.length > 0) {
      codeError.style.display = 'block';
      codeInput.classList.add('invalid');
    } else {
      codeError.style.display = 'none';
      codeInput.classList.remove('invalid');
    }

    const newValue = {
      code: codeVal,
      status: statusSelect.value
    };

    const event = new CustomEvent('custom-form-change', { detail: { fieldPath, value: newValue } });
    document.dispatchEvent(event);
  }

  // Uppercase on blur for convenience
  codeInput.addEventListener('blur', (e) => {
    e.target.value = (e.target.value || '').trim().toUpperCase();
    validateAndDispatch();
  });

  codeInput.addEventListener('input', () => {
    // Hide error while typing
    codeError.style.display = 'none';
    codeInput.classList.remove('invalid');
  });

  statusSelect.addEventListener('change', () => validateAndDispatch());

  // Initial dispatch so host UI can pick up initial value
  setTimeout(() => validateAndDispatch(), 0);

  return container;
}

function renderForDisplay(value) {
  if (!value) return '';
  const code = value.code || '';
  const status = value.status || '';
  if (!code) return '';
  return `**${code}** (${status})`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCustomForm, renderForDisplay };
}
