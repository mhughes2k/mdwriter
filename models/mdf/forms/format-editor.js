/**
 * Custom Form: Module Format Editor
 * 
 * Provides an interface for managing module format components (lectures, labs, etc.)
 * 
 * @param {Object} property - Schema property definition
 * @param {Array} value - Current field value (array of format items)
 * @param {String} fieldPath - Path to field in document
 * @param {Object} data - Additional data (not used)
 * @returns {HTMLElement} - The custom form DOM element
 */
function createCustomForm(property, value, fieldPath, data) {
  const formats = Array.isArray(value) ? value : [];
  
  const container = document.createElement('div');
  container.className = 'custom-form format-editor';
  container.dataset.fieldPath = fieldPath;

  const table = document.createElement('table');
  table.className = 'format-table';
  
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Component</th>
      <th style="width: 120px;">Hours</th>
      <th style="width: 40px;"></th>
    </tr>
  `;
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  
  container.appendChild(table);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'btn-add-item';
  addButton.textContent = '+ Add Component';
  container.appendChild(addButton);

  function renderFormats() {
    tbody.innerHTML = '';
    
    formats.forEach((format, index) => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'field-input';
      nameInput.value = format.name || '';
      nameInput.placeholder = 'e.g., Lectures, Labs, Tutorials';
      nameInput.addEventListener('input', (e) => {
        format.name = e.target.value;
        dispatchChange();
      });
      nameCell.appendChild(nameInput);
      row.appendChild(nameCell);
      
      const hoursCell = document.createElement('td');
      const hoursInput = document.createElement('input');
      hoursInput.type = 'number';
      hoursInput.className = 'field-input';
      hoursInput.value = format.hours || '';
      hoursInput.min = 0;
      hoursInput.step = 0.5;
      hoursInput.addEventListener('input', (e) => {
        format.hours = parseFloat(e.target.value) || 0;
        updateTotal(); // Update only the total row
        dispatchChange();
      });
      hoursCell.appendChild(hoursInput);
      row.appendChild(hoursCell);
      
      const actionCell = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove-small';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove component';
      removeBtn.addEventListener('click', () => {
        formats.splice(index, 1);
        renderFormats();
        dispatchChange();
      });
      actionCell.appendChild(removeBtn);
      row.appendChild(actionCell);
      
      tbody.appendChild(row);
    });
    
    // Add total row
    if (formats.length > 0) {
      const totalRow = document.createElement('tr');
      totalRow.className = 'total-row';
      totalRow.dataset.totalRow = 'true';
      
      const labelCell = document.createElement('td');
      labelCell.textContent = 'Total Hours';
      labelCell.style.fontWeight = 'bold';
      totalRow.appendChild(labelCell);
      
      const totalCell = document.createElement('td');
      const total = formats.reduce((sum, f) => sum + (parseFloat(f.hours) || 0), 0);
      totalCell.textContent = total.toFixed(1);
      totalCell.style.fontWeight = 'bold';
      totalCell.dataset.totalCell = 'true';
      totalRow.appendChild(totalCell);
      
      const emptyCell = document.createElement('td');
      totalRow.appendChild(emptyCell);
      
      tbody.appendChild(totalRow);
    }
  }

  function updateTotal() {
    const totalCell = tbody.querySelector('[data-total-cell]');
    if (totalCell) {
      const total = formats.reduce((sum, f) => sum + (parseFloat(f.hours) || 0), 0);
      totalCell.textContent = total.toFixed(1);
    }
  }

  function dispatchChange() {
    const event = new CustomEvent('custom-form-change', {
      detail: { fieldPath, value: formats }
    });
    document.dispatchEvent(event);
  }

  addButton.addEventListener('click', () => {
    formats.push({ name: '', hours: 0 });
    renderFormats();
    dispatchChange();
  });

  renderFormats();

  return container;
}

/**
 * Render function for display/preview (non-interactive)
 */
function renderForDisplay(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return '';
  }
  
  return value.map(format => {
    const name = format.name || 'Unnamed';
    let output = `${name}: ${format.hours || 0} hours`;
    if (format.weeks) {
      output += ` over ${format.weeks} weeks`;
    }
    return output;
  }).join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCustomForm, renderForDisplay };
}
