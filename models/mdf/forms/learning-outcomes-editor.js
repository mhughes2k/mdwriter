/**
 * Custom Form: Learning Outcomes Editor
 * 
 * Provides an interface for managing learning outcomes with assessment criteria
 * 
 * @param {Object} property - Schema property definition
 * @param {Array} value - Current field value (array of learning outcomes)
 * @param {String} fieldPath - Path to field in document
 * @param {Object} data - Additional data (not used)
 * @returns {HTMLElement} - The custom form DOM element
 */
function createCustomForm(property, value, fieldPath, data) {
  const outcomes = Array.isArray(value) ? value : [];
  
  const container = document.createElement('div');
  container.className = 'custom-form learning-outcomes-editor';
  container.dataset.fieldPath = fieldPath;

  const listContainer = document.createElement('div');
  listContainer.className = 'outcomes-list';
  container.appendChild(listContainer);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'btn-add-item';
  addButton.textContent = '+ Add Learning Outcome';
  container.appendChild(addButton);

  function renderOutcomes() {
    listContainer.innerHTML = '';
    
    outcomes.forEach((outcome, index) => {
      const outcomeCard = document.createElement('div');
      outcomeCard.className = 'outcome-card';
      
      const header = document.createElement('div');
      header.className = 'outcome-header';
      
      const title = document.createElement('h4');
      title.textContent = `Learning Outcome ${index + 1}`;
      header.appendChild(title);
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove this outcome';
      removeBtn.addEventListener('click', () => {
        outcomes.splice(index, 1);
        renderOutcomes();
        dispatchChange();
      });
      header.appendChild(removeBtn);
      
      outcomeCard.appendChild(header);
      
      // Description field
      const descLabel = document.createElement('label');
      descLabel.textContent = 'Description';
      outcomeCard.appendChild(descLabel);
      
      const descTextarea = document.createElement('textarea');
      descTextarea.className = 'field-input';
      descTextarea.value = outcome.description || '';
      descTextarea.rows = 3;
      descTextarea.addEventListener('input', (e) => {
        outcome.description = e.target.value;
        dispatchChange();
      });
      outcomeCard.appendChild(descTextarea);
      
      // Assessment criteria
      const criteriaLabel = document.createElement('label');
      criteriaLabel.textContent = 'Assessment Criteria';
      outcomeCard.appendChild(criteriaLabel);
      
      const criteriaList = document.createElement('div');
      criteriaList.className = 'criteria-list';
      
      const criteria = Array.isArray(outcome.assessmentcriteria) ? outcome.assessmentcriteria : [];
      
      criteria.forEach((criterion, criterionIndex) => {
        const criterionRow = document.createElement('div');
        criterionRow.className = 'criterion-row';
        
        const criterionInput = document.createElement('input');
        criterionInput.type = 'text';
        criterionInput.className = 'field-input';
        criterionInput.value = criterion;
        criterionInput.addEventListener('input', (e) => {
          criteria[criterionIndex] = e.target.value;
          dispatchChange();
        });
        criterionRow.appendChild(criterionInput);
        
        const removeCriterionBtn = document.createElement('button');
        removeCriterionBtn.type = 'button';
        removeCriterionBtn.className = 'btn-remove-small';
        removeCriterionBtn.textContent = '×';
        removeCriterionBtn.addEventListener('click', () => {
          criteria.splice(criterionIndex, 1);
          outcome.assessmentcriteria = criteria;
          renderOutcomes();
          dispatchChange();
        });
        criterionRow.appendChild(removeCriterionBtn);
        
        criteriaList.appendChild(criterionRow);
      });
      
      outcomeCard.appendChild(criteriaList);
      
      const addCriterionBtn = document.createElement('button');
      addCriterionBtn.type = 'button';
      addCriterionBtn.className = 'btn-add-criterion';
      addCriterionBtn.textContent = '+ Add Criterion';
      addCriterionBtn.addEventListener('click', () => {
        if (!outcome.assessmentcriteria) outcome.assessmentcriteria = [];
        outcome.assessmentcriteria.push('');
        renderOutcomes();
        dispatchChange();
      });
      outcomeCard.appendChild(addCriterionBtn);
      
      listContainer.appendChild(outcomeCard);
    });
  }

  function dispatchChange() {
    const event = new CustomEvent('custom-form-change', {
      detail: { fieldPath, value: outcomes }
    });
    document.dispatchEvent(event);
  }

  addButton.addEventListener('click', () => {
    outcomes.push({ description: '', assessmentcriteria: [] });
    renderOutcomes();
    dispatchChange();
  });

  renderOutcomes();

  return container;
}

/**
 * Render function for display/preview (non-interactive)
 */
function renderForDisplay(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return '';
  }
  
  return value.map((outcome, index) => {
    let output = `${index + 1}. ${outcome.description || ''}`;
    
    // Add assessment criteria if present
    if (Array.isArray(outcome.assessmentcriteria) && outcome.assessmentcriteria.length > 0) {
      const criteria = outcome.assessmentcriteria
        .filter(c => c && c.trim())
        .map(c => `   - ${c}`)
        .join('\n');
      if (criteria) {
        output += '\n' + criteria;
      }
    }
    
    return output;
  }).join('\n\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCustomForm, renderForDisplay };
}
