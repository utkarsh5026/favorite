import { CONFIG, state, loadSettings, listenForSettingsChanges } from './state';
import { changeFavicon, saveOriginalFavicon, restoreOriginalFavicon } from './favicon';
import { findImageElement, getImageUrl } from './image';

/**
 * Handles mouseover events to change favicon on hover
 */
function handleImageHover(event: MouseEvent): void {
  clearHoverTimeout();
  clearRestoreTimeout();

  const target = event.target as Element;
  const imageElement = findImageElement(target);

  if (!imageElement) return;

  if (!meetsMinimumSize(imageElement)) return;

  const imageResult = getImageUrl(imageElement);

  if (imageResult && imageResult.url) {
    state.currentHoveredElement = imageElement;

    state.currentHoverTimeout = window.setTimeout(() => {
      changeFavicon(imageResult.url);
      state.currentHoverTimeout = null;
    }, CONFIG.hoverDelay);
  }
}

/**
 * Handles mouseout events to restore original favicon
 */
function handleImageLeave(event: MouseEvent): void {
  const target = event.target as Element;
  const imageElement = findImageElement(target);

  if (!imageElement) return;

  const relatedTarget = event.relatedTarget as Node | null;
  if (relatedTarget && imageElement.contains(relatedTarget)) {
    return;
  }

  if (state.currentHoveredElement && state.currentHoveredElement !== imageElement) {
    return;
  }

  clearHoverTimeout();
  state.currentHoveredElement = null;

  state.currentRestoreTimeout = window.setTimeout(() => {
    restoreOriginalFavicon();
    state.currentRestoreTimeout = null;
  }, CONFIG.restoreDelay);
}

/**
 * Checks if an element meets minimum size requirements
 */
function meetsMinimumSize(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= CONFIG.minImageSize && rect.height >= CONFIG.minImageSize;
}

/**
 * Clears any pending hover timeout
 */
function clearHoverTimeout(): void {
  if (state.currentHoverTimeout !== null) {
    clearTimeout(state.currentHoverTimeout);
    state.currentHoverTimeout = null;
  }
}

/**
 * Clears any pending restore timeout
 */
function clearRestoreTimeout(): void {
  if (state.currentRestoreTimeout !== null) {
    clearTimeout(state.currentRestoreTimeout);
    state.currentRestoreTimeout = null;
  }
}

/**
 * Initializes the extension
 */
async function init(): Promise<void> {
  if (state.isInitialized) {
    console.warn('Image Favicon Preview: Already initialized');
    return;
  }

  await loadSettings();
  listenForSettingsChanges();

  console.log('Image Favicon Preview: Extension loaded on', window.location.hostname);

  saveOriginalFavicon();
  document.addEventListener('mouseover', handleImageHover);
  document.addEventListener('mouseout', handleImageLeave);

  state.isInitialized = true;
}

/**
 * Cleanup function for extension unload
 */
function cleanup(): void {
  console.log('Image Favicon Preview: Cleaning up');

  clearHoverTimeout();
  clearRestoreTimeout();

  document.removeEventListener('mouseover', handleImageHover);
  document.removeEventListener('mouseout', handleImageLeave);

  restoreOriginalFavicon();
  state.isInitialized = false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', cleanup);
