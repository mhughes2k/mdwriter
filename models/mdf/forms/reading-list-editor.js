/**
 * Custom Form: Reading List Editor
 * 
 * Provides an interface for managing reading list items
 * 
 * @param {Object} property - Schema property definition
 * @param {Array} value - Current field value (array of reading list items)
 * @param {String} fieldPath - Path to field in document
 * @param {Object} data - Additional data (not used)
 * @returns {HTMLElement} - The custom form DOM element
 */
function createCustomForm(property, value, fieldPath, data) {
  const items = Array.isArray(value) ? value : [];
  const recommendations = ["Purchase Recommended", "Highly Recommended", "For Reference"];
  
  const container = document.createElement('div');
  container.className = 'custom-form reading-list-editor';
  container.dataset.fieldPath = fieldPath;

  const listContainer = document.createElement('div');
  listContainer.className = 'reading-list';
  container.appendChild(listContainer);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'btn-add-item';
  addButton.textContent = '+ Add Reading';
  container.appendChild(addButton);

  function renderItems() {
    listContainer.innerHTML = '';
    
    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'reading-card';
      
      const header = document.createElement('div');
      header.className = 'reading-header';
      
      const title = document.createElement('h4');
      title.textContent = `Reading ${index + 1}`;
      header.appendChild(title);
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove this reading';
      removeBtn.addEventListener('click', () => {
        items.splice(index, 1);
        renderItems();
        dispatchChange();
      });
      header.appendChild(removeBtn);
      
      card.appendChild(header);
      
      // Title (required)
      const titleLabel = document.createElement('label');
      titleLabel.textContent = 'Title *';
      card.appendChild(titleLabel);
      
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'field-input';
      titleInput.value = item.title || '';
      titleInput.addEventListener('input', (e) => {
        item.title = e.target.value;
        dispatchChange();
      });
      card.appendChild(titleInput);
      
      // Authors and Edition row
      const row1 = document.createElement('div');
      row1.className = 'form-row';
      
      const authorsCol = document.createElement('div');
      authorsCol.className = 'form-col';
      const authorsLabel = document.createElement('label');
      authorsLabel.textContent = 'Author(s)';
      authorsCol.appendChild(authorsLabel);
      const authorsInput = document.createElement('input');
      authorsInput.type = 'text';
      authorsInput.className = 'field-input';
      authorsInput.value = item.authors || '';
      authorsInput.addEventListener('input', (e) => {
        item.authors = e.target.value;
        dispatchChange();
      });
      authorsCol.appendChild(authorsInput);
      row1.appendChild(authorsCol);
      
      const editionCol = document.createElement('div');
      editionCol.className = 'form-col';
      const editionLabel = document.createElement('label');
      editionLabel.textContent = 'Edition';
      editionCol.appendChild(editionLabel);
      const editionInput = document.createElement('input');
      editionInput.type = 'text';
      editionInput.className = 'field-input';
      editionInput.value = item.edition || '';
      editionInput.placeholder = 'e.g., 3rd';
      editionInput.addEventListener('input', (e) => {
        item.edition = e.target.value;
        dispatchChange();
      });
      editionCol.appendChild(editionInput);
      row1.appendChild(editionCol);
      
      card.appendChild(row1);
      
      // Publisher and Year row
      const row2 = document.createElement('div');
      row2.className = 'form-row';
      
      const publisherCol = document.createElement('div');
      publisherCol.className = 'form-col';
      const publisherLabel = document.createElement('label');
      publisherLabel.textContent = 'Publisher';
      publisherCol.appendChild(publisherLabel);
      const publisherInput = document.createElement('input');
      publisherInput.type = 'text';
      publisherInput.className = 'field-input';
      publisherInput.value = item.publisher || '';
      publisherInput.addEventListener('input', (e) => {
        item.publisher = e.target.value;
        dispatchChange();
      });
      publisherCol.appendChild(publisherInput);
      row2.appendChild(publisherCol);
      
      const yearCol = document.createElement('div');
      yearCol.className = 'form-col';
      const yearLabel = document.createElement('label');
      yearLabel.textContent = 'Year';
      yearCol.appendChild(yearLabel);
      const yearInput = document.createElement('input');
      yearInput.type = 'text';
      yearInput.className = 'field-input';
      yearInput.value = item.year || '';
      yearInput.placeholder = 'YYYY';
      yearInput.addEventListener('input', (e) => {
        item.year = e.target.value;
        dispatchChange();
      });
      yearCol.appendChild(yearInput);
      row2.appendChild(yearCol);
      
      card.appendChild(row2);
      
      // ISBN
      const isbnLabel = document.createElement('label');
      isbnLabel.textContent = 'ISBN';
      card.appendChild(isbnLabel);
      
      const isbnInput = document.createElement('input');
      isbnInput.type = 'text';
      isbnInput.className = 'field-input';
      isbnInput.value = item.isbn || '';
      isbnInput.addEventListener('input', (e) => {
        item.isbn = e.target.value;
        dispatchChange();
      });
      card.appendChild(isbnInput);
      
      // Link
      const linkLabel = document.createElement('label');
      linkLabel.textContent = 'Link';
      card.appendChild(linkLabel);
      
      const linkInput = document.createElement('input');
      linkInput.type = 'url';
      linkInput.className = 'field-input';
      linkInput.value = item.link || '';
      linkInput.placeholder = 'https://...';
      linkInput.addEventListener('input', (e) => {
        item.link = e.target.value;
        dispatchChange();
      });
      card.appendChild(linkInput);
      
      // Recommendation (required)
      const recLabel = document.createElement('label');
      recLabel.textContent = 'Recommendation *';
      card.appendChild(recLabel);
      
      const recSelect = document.createElement('select');
      recSelect.className = 'field-input';
      
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select recommendation...';
      recSelect.appendChild(defaultOption);
      
      recommendations.forEach(rec => {
        const option = document.createElement('option');
        option.value = rec;
        option.textContent = rec;
        if (item.recommendation === rec) option.selected = true;
        recSelect.appendChild(option);
      });
      
      recSelect.addEventListener('change', (e) => {
        item.recommendation = e.target.value;
        dispatchChange();
      });
      card.appendChild(recSelect);
      
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
      title: '', 
      authors: '', 
      edition: '', 
      year: '', 
      publisher: '', 
      isbn: '', 
      link: '', 
      recommendation: '' 
    });
    renderItems();
    dispatchChange();
  });

  renderItems();

  return container;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCustomForm };
}
