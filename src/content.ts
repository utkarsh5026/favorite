const CONFIG: ExtensionConfig = {
  hoverDelay: 100,
  restoreDelay: 200,
  iconSelectors: [
    'li',
    '.icon',
    '[class*="fi-"]',
    'figure',
    '.detail',
    '[class*="item"]',
    '[class*="grid"]'
  ]
} as const;

const state: ExtensionState = {
  originalFavicon: null,
  currentHoverTimeout: null,
  currentRestoreTimeout: null,
  isInitialized: false
};


/**
 * Restores the original favicon
 */
function restoreOriginalFavicon(): void {
  clearHoverTimeout();
  
  if (state.originalFavicon) {
    changeFavicon(state.originalFavicon);
  }
}

/**
 * Initializes the extension
 * 
 * Sets up event listeners and saves the original favicon
 * Uses event delegation for better performance
 */
function init(): void {
  if (state.isInitialized) {
    console.warn('Flaticon Favicon Preview: Already initialized');
    return;
  }
  
  console.log('Flaticon Favicon Preview: Extension loaded');

  saveOriginalFavicon();
  document.addEventListener('mouseover', handleIconHover);
  document.addEventListener('mouseout', handleIconLeave);
  
  state.isInitialized = true;
}

/**
 * Cleanup function for extension unload
 */
function cleanup(): void {
  console.log('Flaticon Favicon Preview: Cleaning up');

  clearHoverTimeout();
  clearRestoreTimeout();

  document.removeEventListener('mouseover', handleIconHover);
  document.removeEventListener('mouseout', handleIconLeave);
  

  restoreOriginalFavicon();
  state.isInitialized = false;
}

/**
 * Run initialization when DOM is ready
 * 
 * document.readyState can be:
 * - 'loading': Document still loading
 * - 'interactive': DOM ready, but resources (images, styles) still loading
 * - 'complete': Everything loaded
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', cleanup);