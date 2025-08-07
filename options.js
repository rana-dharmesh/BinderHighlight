document.addEventListener('DOMContentLoaded', () => {
  const colorsContainer = document.querySelector('.colors');
  const saveButton = document.getElementById('save');
  const resetButton = document.getElementById('reset');

  // Default color pairs as provided by the user (20 pairs)
  const defaultColors = [
    ['#000000', '#F160FC'],
    ['#000000', '#0D9034'],
    ['#000000', '#8B9AFD'],
    ['#000000', '#14A8FD'],
    ['#000000', '#009999'],
    ['#000000', '#9999FF'],
    ['#000000', '#FF99CC'],
    ['#000000', '#FF00FF'],
    ['#000000', '#FF1493'],
    ['#000000', '#FF6F59'],
    ['#000000', '#C8FFAC'],
    ['#000000', '#F160FC'],
    ['#000000', '#0D9034'],
    ['#000000', '#8B9AFD'],
    ['#000000', '#14A8FD'],
    ['#000000', '#009999'],
    ['#000000', '#9999FF'],
    ['#000000', '#FF99CC'],
    ['#000000', '#FF00FF'],
	  ['#000000', '#F160FC']
  ];

  const colorKeys = Array.from({ length: 20 }, (_, i) => ({
    colorKey: `style${i}Color`,
    backgroundKey: `style${i}Background`,
  }));

  // Function to create color input rows
  function createColorRow(index) {
    const div = document.createElement('div');
    div.className = 'color-entry';
    div.dataset.index = index;

    // Ensure defaultColors has enough values (20 in total)
    if (defaultColors[index]) {
      const colorValue = defaultColors[index][0];
      const backgroundValue = defaultColors[index][1];

      div.innerHTML = `
        <span>Color ${index + 1}</span>
        <input type="color" class="color-input" data-type="color" value="${colorValue}">
        <input type="color" class="color-input" data-type="background" value="${backgroundValue}">
        <div class="preview"></div>
      `;
    } else {
      console.error(`Error: defaultColors[${index}] is undefined`);
    }

    return div;
  }

  // Initialize UI with 20 rows
  function initializeUI() {
    colorsContainer.innerHTML = ''; // Clear previous entries
    for (let i = 0; i < 20; i++) {
      colorsContainer.appendChild(createColorRow(i));
    }
  }

  // Load saved values from storage or use defaults
  function loadSavedColors() {
    const keys = colorKeys.flatMap(({ colorKey, backgroundKey }) => [colorKey, backgroundKey]);
    chrome.storage.sync.get(keys, (result) => {
      console.log('Loaded values from storage:', result);
      colorKeys.forEach(({ colorKey, backgroundKey }, index) => {
        const row = colorsContainer.querySelector(`[data-index="${index}"]`);
        const colorInput = row.querySelector('[data-type="color"]');
        const backgroundInput = row.querySelector('[data-type="background"]');
        //const preview = row.querySelector('.preview');

        // Use saved values or defaults
        const savedColor = result[colorKey] || defaultColors[index][0];
        const savedBackground = result[backgroundKey] || defaultColors[index][1];

        colorInput.value = savedColor;
        backgroundInput.value = savedBackground;

        // Update preview
        //preview.style.color = savedColor;
        //preview.style.backgroundColor = savedBackground;
      });
    });
  }

  // Save current values to storage
  function saveColors() {
    const saveData = {};
    colorKeys.forEach(({ colorKey, backgroundKey }, index) => {
      const row = colorsContainer.querySelector(`[data-index="${index}"]`);
      const colorInput = row.querySelector('[data-type="color"]');
      const backgroundInput = row.querySelector('[data-type="background"]');

      // Ensure the input exists before trying to read its value
      if (colorInput && backgroundInput) {
        saveData[colorKey] = colorInput.value;
        saveData[backgroundKey] = backgroundInput.value;
      } else {
        console.error(`Error: color input or background input not found for row ${index}`);
      }
    });

    chrome.storage.sync.set(saveData, () => {
      console.log('Saved values:', saveData);
      alert('Options saved!');
    });
  }

  // Reset to default values
  function resetColors() {
    colorKeys.forEach(({ colorKey, backgroundKey }, index) => {
      const row = colorsContainer.querySelector(`[data-index="${index}"]`);
      const colorInput = row.querySelector('[data-type="color"]');
      const backgroundInput = row.querySelector('[data-type="background"]');
      //const preview = row.querySelector('.preview');

      colorInput.value = defaultColors[index][0];
      backgroundInput.value = defaultColors[index][1];
      //preview.style.color = defaultColors[index][0];
      //preview.style.backgroundColor = defaultColors[index][1];
    });

    chrome.storage.sync.clear(() => {
      console.log('Reset all values to defaults.');
    });
  }

  // Add input event listeners for live preview
  function setupEventListeners() {
    colorsContainer.addEventListener('input', (event) => {
      const row = event.target.closest('.color-entry');
      //const preview = row.querySelector('.preview');
      const colorInput = row.querySelector('[data-type="color"]');
      const backgroundInput = row.querySelector('[data-type="background"]');

      //preview.style.color = colorInput.value;
      //preview.style.backgroundColor = backgroundInput.value;
    });

    saveButton.addEventListener('click', saveColors);
    resetButton.addEventListener('click', resetColors);
  }

  // Initialize the page
  initializeUI();
  loadSavedColors();
  setupEventListeners();
});
