// Initialize and apply styles from storage
function applyStoredColors() {
  const keys = Array.from({ length: 20 }, (_, i) => ({
    colorKey: `style${i}Color`,
    backgroundKey: `style${i}Background`,
  })).flatMap(({ colorKey, backgroundKey }) => [colorKey, backgroundKey]);

  // Get all stored color and background values
  chrome.storage.sync.get(keys, (result) => {
    console.log('Applying stored styles:', result);
    const root = document.documentElement;

    // Set the CSS variables for each style
    Array.from({ length: 20 }).forEach((_, index) => {
      const colorValue = result[`style${index}Color`] || '#000000'; // Default to black
      const backgroundValue = result[`style${index}Background`] || '#ffffff'; // Default to white

      // Set the CSS variables on the root element
      root.style.setProperty(`--style${index}-color`, colorValue);
      root.style.setProperty(`--style${index}-background`, backgroundValue);
    });
  });
}

// Listen for changes in storage and apply updates dynamically
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    console.log('Storage changes detected:', changes);
    const root = document.documentElement;

    // For each changed value, apply the new color or background
    for (let [key, { newValue }] of Object.entries(changes)) {
      if (key.startsWith('style') && key.endsWith('Color')) {
        const index = key.match(/\d+/)[0];
        root.style.setProperty(`--style${index}-color`, newValue);
      }
      if (key.startsWith('style') && key.endsWith('Background')) {
        const index = key.match(/\d+/)[0];
        root.style.setProperty(`--style${index}-background`, newValue);
      }
    }
  }
});

// Apply stored colors when the content script runs
applyStoredColors();
