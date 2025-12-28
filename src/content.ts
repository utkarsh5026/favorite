import { CONFIG, state, loadSettings, listenForSettingsChanges, isSiteDisabled } from './state';
import { changeFavicon, saveOriginalFavicon, restoreOriginalFavicon } from './favicon';
import { findImageElement, getImageUrl } from './image';

let isCurrentSiteDisabled = false;

/**
 * Handles mouseover events to change favicon on hover
 */
function handleImageHover(event: MouseEvent): void {
  if (isCurrentSiteDisabled) return;

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

  // Check if current site is disabled
  const hostname = window.location.hostname;
  isCurrentSiteDisabled = await isSiteDisabled(hostname);

  if (isCurrentSiteDisabled) {
    console.log('Image Favicon Preview: Disabled for', hostname);
    state.isInitialized = true;
    listenForSiteEnableChange(hostname);
    return;
  }

  console.log('Image Favicon Preview: Extension loaded on', hostname);

  saveOriginalFavicon();
  document.addEventListener('mouseover', handleImageHover);
  document.addEventListener('mouseout', handleImageLeave);
  listenForSiteEnableChange(hostname);

  state.isInitialized = true;
}

/**
 * Listens for changes to the disabled sites list
 */
function listenForSiteEnableChange(hostname: string): void {
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes.disabledSites) return;

    const newDisabledSites = changes.disabledSites.newValue as string[];
    const wasDisabled = isCurrentSiteDisabled;
    isCurrentSiteDisabled = newDisabledSites.includes(hostname);

    if (wasDisabled && !isCurrentSiteDisabled) {
      // Site was re-enabled
      console.log('Image Favicon Preview: Re-enabled for', hostname);
      saveOriginalFavicon();
      document.addEventListener('mouseover', handleImageHover);
      document.addEventListener('mouseout', handleImageLeave);
    } else if (!wasDisabled && isCurrentSiteDisabled) {
      // Site was disabled
      console.log('Image Favicon Preview: Disabled for', hostname);
      cleanup();
      state.isInitialized = true; // Keep initialized to prevent re-init
    }
  });
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
