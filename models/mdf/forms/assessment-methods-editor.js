/**
 * Custom Form: Assessment Methods Editor
 * 
 * Provides an interface for managing assessment methods (exams, coursework, etc.)
 * 
 * @param {Object} property - Schema property definition
 * @param {Array} value - Current field value (array of assessment methods)
 * @param {String} fieldPath - Path to field in document
 * @param {Object} data - Additional data (not used)
 * @returns {HTMLElement} - The custom form DOM element
 */
function createCustomForm(property, value, fieldPath, data) {
  const methods = Array.isArray(value) ? value : [];
  const types = ["Examination", "Coursework"];
  
  const container = document.createElement('div');
  container.className = 'custom-form assessment-methods-editor';
  container.dataset.fieldPath = fieldPath;

  const listContainer = document.createElement('div');
  listContainer.className = 'methods-list';
  container.appendChild(listContainer);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'btn-add-item';
  addButton.textContent = '+ Add Assessment Method';
  container.appendChild(addButton);

  function renderMethods() {
    listContainer.innerHTML = '';
    
    methods.forEach((method, index) => {
      const card = document.createElement('div');
      card.className = 'assessment-card';
      
      const header = document.createElement('div');
      header.className = 'assessment-header';
      
      const title = document.createElement('h4');
      title.textContent = `Assessment ${index + 1}`;
      header.appendChild(title);
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove this assessment';
      removeBtn.addEventListener('click', () => {
        methods.splice(index, 1);
        renderMethods();
        dispatchChange();
      });
      header.appendChild(removeBtn);
      
      card.appendChild(header);
      
      // Type selector
      const typeLabel = document.createElement('label');
      typeLabel.textContent = 'Type *';
      card.appendChild(typeLabel);
      
      const typeSelect = document.createElement('select');
      typeSelect.className = 'field-input';
      
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select type...';
      typeSelect.appendChild(defaultOption);
      
      types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        if (method.type === type) option.selected = true;
        typeSelect.appendChild(option);
      });
      
      typeSelect.addEventListener('change', (e) => {
        method.type = e.target.value;
        dispatchChange();
      });
      card.appendChild(typeSelect);
      
      // Description
      const descLabel = document.createElement('label');
      descLabel.textContent = 'Description';
      card.appendChild(descLabel);
      
      const descTextarea = document.createElement('textarea');
      descTextarea.className = 'field-input';
      descTextarea.value = method.description || '';
      descTextarea.rows = 2;
      descTextarea.addEventListener('input', (e) => {
        method.description = e.target.value;
        dispatchChange();
      });
      card.appendChild(descTextarea);
      
      // Row for occurrence and duration
      const row1 = document.createElement('div');
      row1.className = 'form-row';
      
      const occurCol = document.createElement('div');
      occurCol.className = 'form-col';
      const occurLabel = document.createElement('label');
      occurLabel.textContent = 'Occurrence';
      occurCol.appendChild(occurLabel);
      const occurInput = document.createElement('input');
      occurInput.type = 'text';
      occurInput.className = 'field-input';
      occurInput.value = method.occurence || '';
      occurInput.placeholder = 'e.g., Week 12';
      occurInput.addEventListener('input', (e) => {
        method.occurence = e.target.value;
        dispatchChange();
      });
      occurCol.appendChild(occurInput);
      row1.appendChild(occurCol);
      
      const durationCol = document.createElement('div');
      durationCol.className = 'form-col';
      const durationLabel = document.createElement('label');
      durationLabel.textContent = 'Duration (mins)';
      durationCol.appendChild(durationLabel);
      const durationInput = document.createElement('input');
      durationInput.type = 'number';
      durationInput.className = 'field-input';
      durationInput.value = method.duration || '';
      durationInput.min = 0;
      durationInput.addEventListener('input', (e) => {
        method.duration = parseInt(e.target.value) || 0;
        dispatchChange();
      });
      durationCol.appendChild(durationInput);
      row1.appendChild(durationCol);
      
      card.appendChild(row1);
      
      // Weighting
      const weightLabel = document.createElement('label');
      weightLabel.textContent = 'Weighting (%)';
      card.appendChild(weightLabel);
      
      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.className = 'field-input';
      weightInput.value = method.weighting || '';
      weightInput.min = 0;
      weightInput.max = 100;
      weightInput.step = 0.1;
      weightInput.addEventListener('input', (e) => {
        method.weighting = parseFloat(e.target.value) || 0;
        updateTotalWeighting(); // Update only the total display
        dispatchChange();
      });
      card.appendChild(weightInput);
      
      listContainer.appendChild(card);
    });
    
    updateTotalWeighting();
  }
  
  function updateTotalWeighting() {
    // Remove existing total if present
    const existingTotal = listContainer.querySelector('.total-weighting');
    if (existingTotal) {
      existingTotal.remove();
    }
    
    // Add total weighting display
    if (methods.length > 0) {
      const totalCard = document.createElement('div');
      totalCard.className = 'total-weighting';
      const total = methods.reduce((sum, m) => sum + (parseFloat(m.weighting) || 0), 0);
      totalCard.innerHTML = `<strong>Total Weighting:</strong> ${total.toFixed(1)}%`;
      if (Math.abs(total - 100) > 0.1) {
        totalCard.classList.add('warning');
      }
      listContainer.appendChild(totalCard);
    }
  }

  function dispatchChange() {
    const event = new CustomEvent('custom-form-change', {
      detail: { fieldPath, value: methods }
    });
    document.dispatchEvent(event);
  }

  addButton.addEventListener('click', () => {
    methods.push({ description: '', type: '', occurence: '', duration: 0, weighting: 0 });
    renderMethods();
    dispatchChange();
  });

  renderMethods();

  return container;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCustomForm };
}
