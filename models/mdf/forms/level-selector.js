/**
 * Custom Form: Level Selector
 * 
 * Provides a dropdown selector for SCQF levels with detailed information
 * about qualifications at each level.
 * 
 * This function is called by the form generator with the following parameters:
 * @param {Object} property - Schema property definition
 * @param {Object} value - Current field value
 * @param {String} fieldPath - Path to field in document
 * @param {Object} data - Data loaded from dataSource (scqf_levels.json)
 * @returns {HTMLElement} - The custom form DOM element
 */
function createCustomForm(property, value, fieldPath, data) {
  const levels = data.levels || data;
  
  const container = document.createElement('div');
  container.className = 'custom-form level-selector-form';
  container.dataset.fieldPath = fieldPath;

  // Dropdown selector
  const selector = document.createElement('select');
  selector.className = 'level-selector field-input';
  selector.dataset.fieldPath = fieldPath;

  // Default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a level...';
  selector.appendChild(defaultOption);

  // Add level options
  levels.forEach(level => {
    const option = document.createElement('option');
    option.value = JSON.stringify(level);
    option.textContent = `SCQF Level ${level.scqflevel}`;
    
    if (value && value.scqflevel === level.scqflevel) {
      option.selected = true;
    }
    
    selector.appendChild(option);
  });

  container.appendChild(selector);

  // Level details display
  const detailsPanel = document.createElement('div');
  detailsPanel.className = 'level-details-panel';
  container.appendChild(detailsPanel);

  // Helper function to show level details
  function showLevelDetails(panel, level) {
    panel.innerHTML = '';
    
    const details = document.createElement('div');
    details.className = 'level-details';

    const title = document.createElement('h4');
    title.textContent = `SCQF Level ${level.scqflevel}`;
    details.appendChild(title);

    const fields = [
      { title: 'SQA Qualifications', value: level.sqaqualification },
      { title: 'QHEI Qualifications', value: level.qheiqualification },
      { title: 'Apprenticeships/SVQ', value: level.apprenticeshipsvqlevel }
    ];

    fields.forEach(field => {
      if (field.value) {
        const section = document.createElement('div');
        section.className = 'detail-section';
        
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'detail-title';
        sectionTitle.textContent = field.title;
        section.appendChild(sectionTitle);
        
        const sectionContent = document.createElement('div');
        sectionContent.className = 'detail-content';
        sectionContent.textContent = field.value;
        section.appendChild(sectionContent);
        
        details.appendChild(section);
      }
    });

    panel.appendChild(details);
  }

  // Update details and dispatch event on change
  selector.addEventListener('change', (e) => {
    if (e.target.value) {
      const selectedLevel = JSON.parse(e.target.value);
      showLevelDetails(detailsPanel, selectedLevel);
      
      const event = new CustomEvent('custom-form-change', {
        detail: { fieldPath, value: selectedLevel }
      });
      document.dispatchEvent(event);
    } else {
      detailsPanel.innerHTML = '';
    }
  });

  // Show current details if value exists
  if (value) {
    const currentLevel = levels.find(l => l.scqflevel === value.scqflevel);
    if (currentLevel) {
      showLevelDetails(detailsPanel, currentLevel);
    }
  }

  
  return container;
}

/**
 * Render function for display/preview (non-interactive)
 * @param {Object} value - The field value to render
 * @returns {String} - Markdown or HTML string representation
 */
function renderForDisplay(value) {
  if (!value || !value.scqflevel) {
    return '';
  }
  
  let output = `SCQF Level ${value.scqflevel}`;
  
  if (value.qheiqualification) {
    output += ` - ${value.qheiqualification}`;
  }
  
  return output;
}

// Export for use in renderer process via remote loading
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createCustomForm, renderForDisplay };
}