/**
 * Custom Form: FAQ Editor
 * 
 * Provides an interface for managing FAQ items with question, answer, and category
 * 
 * @param {Object} property - Schema property definition
 * @param {Array} value - Current field value (array of FAQ items)
 * @param {String} fieldPath - Path to field in document
 * @param {Object} data - Additional data (not used)
 * @returns {HTMLElement} - The custom form DOM element
 */
function createCustomForm(property, value, fieldPath, data) {
  const items = Array.isArray(value) ? value : [];
  const categories = ["Customer", "Technical", "Business", "Internal", "External"];
  
  const container = document.createElement('div');
  container.className = 'custom-form faq-editor';
  container.dataset.fieldPath = fieldPath;

  const listContainer = document.createElement('div');
  listContainer.className = 'faq-list';
  container.appendChild(listContainer);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'btn-add-item';
  addButton.textContent = '+ Add Question';
  container.appendChild(addButton);

  function renderItems() {
    listContainer.innerHTML = '';
    
    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'faq-card';
      
      const header = document.createElement('div');
      header.className = 'faq-header';
      
      const title = document.createElement('h4');
      const categoryBadge = item.category ? ` [${item.category}]` : '';
      title.textContent = `Q${index + 1}${categoryBadge}`;
      header.appendChild(title);
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove this question';
      removeBtn.addEventListener('click', () => {
        items.splice(index, 1);
        renderItems();
        dispatchChange();
      });
      header.appendChild(removeBtn);
      
      card.appendChild(header);
      
      // Category (optional)
      const categoryLabel = document.createElement('label');
      categoryLabel.textContent = 'Category';
      card.appendChild(categoryLabel);
      
      const categorySelect = document.createElement('select');
      categorySelect.className = 'field-input';
      
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select category...';
      categorySelect.appendChild(defaultOption);
      
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (item.category === cat) option.selected = true;
        categorySelect.appendChild(option);
      });
      
      categorySelect.addEventListener('change', (e) => {
        item.category = e.target.value;
        // Update header to show category
        title.textContent = `Q${index + 1}${e.target.value ? ` [${e.target.value}]` : ''}`;
        dispatchChange();
      });
      card.appendChild(categorySelect);
      
      // Question (required)
      const questionLabel = document.createElement('label');
      questionLabel.textContent = 'Question *';
      card.appendChild(questionLabel);
      
      const questionInput = document.createElement('textarea');
      questionInput.className = 'field-input';
      questionInput.rows = 2;
      questionInput.value = item.question || '';
      questionInput.placeholder = 'Enter the question...';
      questionInput.addEventListener('input', (e) => {
        item.question = e.target.value;
        dispatchChange();
      });
      card.appendChild(questionInput);
      
      // Answer (required)
      const answerLabel = document.createElement('label');
      answerLabel.textContent = 'Answer *';
      card.appendChild(answerLabel);
      
      const answerInput = document.createElement('textarea');
      answerInput.className = 'field-input';
      answerInput.rows = 4;
      answerInput.value = item.answer || '';
      answerInput.placeholder = 'Enter the answer...';
      answerInput.addEventListener('input', (e) => {
        item.answer = e.target.value;
        dispatchChange();
      });
      card.appendChild(answerInput);
      
      listContainer.appendChild(card);
    });
  }

  function dispatchChange() {
    const event = new CustomEvent('custom-form-change', {
      detail: { fieldPath, value: items }
    });
    document.dispatchEvent(event);
  }

  addButton.addEventListener('click', () => {
    items.push({ 
      question: '', 
      answer: '', 
      category: '' 
    });
    renderItems();
    dispatchChange();
  });

  renderItems();

  return container;
}

/**
 * Render function for display/preview (non-interactive)
 */
function renderForDisplay(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return '';
  }
  
  // Group by category if categories exist
  const categorized = {};
  const uncategorized = [];
  
  value.forEach(item => {
    if (item.category) {
      if (!categorized[item.category]) {
        categorized[item.category] = [];
      }
      categorized[item.category].push(item);
    } else {
      uncategorized.push(item);
    }
  });
  
  let output = '';
  
  // Render categorized questions
  Object.keys(categorized).sort().forEach(category => {
    output += `### ${category} Questions\n\n`;
    categorized[category].forEach(item => {
      output += `**Q: ${item.question}**\n\n`;
      output += `${item.answer}\n\n`;
    });
  });
  
  // Render uncategorized questions
  if (uncategorized.length > 0) {
    uncategorized.forEach(item => {
      output += `**Q: ${item.question}**\n\n`;
      output += `${item.answer}\n\n`;
    });
  }
  
  return output.trim();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCustomForm, renderForDisplay };
}
