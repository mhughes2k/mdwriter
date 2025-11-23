/**
 * Custom Form: Staff Editor
 * 
 * Provides an interface for managing module staff members with roles
 * 
 * @param {Object} property - Schema property definition
 * @param {Array} value - Current field value (array of staff)
 * @param {String} fieldPath - Path to field in document
 * @param {Object} data - Additional data (not used)
 * @returns {HTMLElement} - The custom form DOM element
 */
function createCustomForm(property, value, fieldPath, data) {
  const staff = Array.isArray(value) ? value : [];
  const roles = ["Organiser", "Lecturer", "Tutor", "Lab Assistant", "Module Coordinator"];
  
  const container = document.createElement('div');
  container.className = 'custom-form staff-editor';
  container.dataset.fieldPath = fieldPath;

  const table = document.createElement('table');
  table.className = 'staff-table';
  
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Role</th>
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
  addButton.textContent = '+ Add Staff Member';
  container.appendChild(addButton);

  function renderStaff() {
    tbody.innerHTML = '';
    
    staff.forEach((member, index) => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'field-input';
      nameInput.value = member.name || '';
      nameInput.placeholder = 'Staff name';
      nameInput.addEventListener('input', (e) => {
        member.name = e.target.value;
        dispatchChange();
      });
      nameCell.appendChild(nameInput);
      row.appendChild(nameCell);
      
      const roleCell = document.createElement('td');
      const roleSelect = document.createElement('select');
      roleSelect.className = 'field-input';
      
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select role...';
      roleSelect.appendChild(defaultOption);
      
      roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        if (member.role === role) option.selected = true;
        roleSelect.appendChild(option);
      });
      
      roleSelect.addEventListener('change', (e) => {
        member.role = e.target.value;
        dispatchChange();
      });
      roleCell.appendChild(roleSelect);
      row.appendChild(roleCell);
      
      const actionCell = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove-small';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove staff member';
      removeBtn.addEventListener('click', () => {
        staff.splice(index, 1);
        renderStaff();
        dispatchChange();
      });
      actionCell.appendChild(removeBtn);
      row.appendChild(actionCell);
      
      tbody.appendChild(row);
    });
  }

  function dispatchChange() {
    const event = new CustomEvent('custom-form-change', {
      detail: { fieldPath, value: staff }
    });
    document.dispatchEvent(event);
  }

  addButton.addEventListener('click', () => {
    staff.push({ name: '', role: '' });
    renderStaff();
    dispatchChange();
  });

  renderStaff();

  return container;
}

/**
 * Render function for display/preview (non-interactive)
 */
function renderForDisplay(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return '';
  }
  
  return value.map(staff => {
    let output = staff.name;
    if (staff.role) {
      output += ` (${staff.role})`;
    }
    if (staff.email) {
      output += ` - ${staff.email}`;
    }
    return output;
  }).join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCustomForm, renderForDisplay };
}
