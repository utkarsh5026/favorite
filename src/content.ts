import {
  CONFIG,
  state,
  loadSettings,
  listenForSettingsChanges,
  isSiteDisabled,
  isExtensionEnabled,
  clearHoverTimeout,
  clearRestoreTimeout,
} from './state';
import {
  changeFavicon,
  saveOriginalFavicon,
  restoreOriginalFavicon,
  CustomFaviconManager,
} from './favicon';
import { ImageFinder, getImageUrl } from './image';
import type { CustomFavicons } from './types';
import { ImageLocker } from './lock';

let isCurrentSiteDisabled = false;
let isGloballyDisabled = false;
let customFaviconUrl: string | null = null;

const imageLocker = new ImageLocker(state);

/**
 * Handles mouseover events to change favicon on hover
 */
function handleImageHover(event: MouseEvent): void {
  if (isGloballyDisabled || isCurrentSiteDisabled || imageLocker.isImageLocked) return;

  clearHoverTimeout(state);
  clearRestoreTimeout(state);

  const target = event.target as Element;
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  state.currentHoverTimeout = window.setTimeout(() => {
    const imageElement = new ImageFinder(target, mouseX, mouseY).find();

    if (!imageElement) {
      state.currentHoverTimeout = null;
      return;
    }

    if (!meetsMinimumSize(imageElement)) {
      state.currentHoverTimeout = null;
      return;
    }

    const imageResult = getImageUrl(imageElement);

    if (imageResult && imageResult.url) {
      state.currentHoveredElement = imageElement;
      imageLocker.setCurrentHoveredImageUrl(imageResult.url);
      changeFavicon(imageResult.url);
    }

    state.currentHoverTimeout = null;
  }, CONFIG.hoverDelay);
}

/**
 * Handles mouseout events to restore original favicon
 */
function handleImageLeave(_event: MouseEvent): void {
  if (imageLocker.isImageLocked) return;

  clearHoverTimeout(state);
  state.currentHoveredElement = null;
  imageLocker.setCurrentHoveredImageUrl(null);

  state.currentRestoreTimeout = window.setTimeout(() => {
    CustomFaviconManager.restoreToDefaultFavicon(customFaviconUrl);
    state.currentRestoreTimeout = null;
  }, CONFIG.restoreDelay);
}

/**
 * Handles keyboard events for lock/unlock
 */
function handleKeyDown(event: KeyboardEvent): void {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? event.metaKey : event.ctrlKey;

  if (modifierKey && event.altKey && event.code === 'KeyT') {
    event.preventDefault();
    if (imageLocker.isImageLocked) return imageLocker.showLockNotification(true, 'Already locked');
    if (!imageLocker.hoveredImageUrl)
      return imageLocker.showLockNotification(false, 'Hover over an image first');

    imageLocker.lockCurrentImage();
    return;
  }

  if (modifierKey && event.altKey && event.code === 'KeyU') {
    event.preventDefault();
    if (!imageLocker.isImageLocked) {
      return imageLocker.showLockNotification(false, 'No locked image');
    }
    imageLocker.unlockImage(customFaviconUrl);
  }
}

/**
 * Checks for custom favicon and applies it
 */
async function checkCustomFavicon(): Promise<void> {
  const hostname = window.location.hostname;
  const customFavicon = await CustomFaviconManager.getCustomFavicon(hostname);

  if (!customFavicon) return;

  customFaviconUrl = customFavicon.url;
  setTimeout(() => {
    if (customFaviconUrl && !imageLocker.isImageLocked) {
      changeFavicon(customFaviconUrl);
    }
  }, 100);
}

/**
 * Listens for custom favicon changes from popup
 */
function listenForCustomFaviconChanges(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.customFavicons) {
      const hostname = window.location.hostname;
      const newCustomFavicons = (changes.customFavicons.newValue || {}) as CustomFavicons;

      if (newCustomFavicons[hostname]) {
        customFaviconUrl = newCustomFavicons[hostname].url;
        if (!imageLocker.isImageLocked) {
          changeFavicon(customFaviconUrl);
        }
      } else {
        customFaviconUrl = null;
        if (!imageLocker.isImageLocked) {
          restoreOriginalFavicon();
        }
      }
    }
  });
}

/**
 * Listens for unlock messages from popup
 */
function listenForUnlockMessage(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.lockedImage) {
      if (!changes.lockedImage.newValue) {
        imageLocker.handleUnlockFromStorage(customFaviconUrl);
      }
    }
  });
}

/**
 * Checks if an element meets minimum size requirements
 */
function meetsMinimumSize(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= CONFIG.minImageSize && rect.height >= CONFIG.minImageSize;
}

/**
 * Refreshes the current favicon with the updated shape/size
 */
function refreshCurrentFavicon(): void {
  imageLocker.refreshFavicon();
  if (customFaviconUrl && !imageLocker.isImageLocked) {
    changeFavicon(customFaviconUrl);
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

  const hostname = window.location.hostname;

  // Check if extension is globally disabled
  const extensionEnabled = await isExtensionEnabled();
  isGloballyDisabled = !extensionEnabled;

  if (isGloballyDisabled) {
    console.log('Image Favicon Preview: Extension is globally disabled');
    state.isInitialized = true;
    listenForGlobalEnableChange();
    return;
  }

  isCurrentSiteDisabled = await isSiteDisabled(hostname);

  if (isCurrentSiteDisabled) {
    console.log('Image Favicon Preview: Disabled for', hostname);
    state.isInitialized = true;
    listenForSiteEnableChange(hostname);
    listenForGlobalEnableChange();
    return;
  }

  console.log('Image Favicon Preview: Extension loaded on', hostname);

  saveOriginalFavicon();

  await checkCustomFavicon();
  await imageLocker.checkAndInitialize();

  listenForSettingsChanges(refreshCurrentFavicon);

  document.addEventListener('mouseover', handleImageHover);
  document.addEventListener('mouseout', handleImageLeave);
  document.addEventListener('keydown', handleKeyDown);

  listenForSiteEnableChange(hostname);
  listenForGlobalEnableChange();
  listenForUnlockMessage();
  listenForCustomFaviconChanges();

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

    if (wasDisabled && !isCurrentSiteDisabled && !isGloballyDisabled) {
      saveOriginalFavicon();
      document.addEventListener('mouseover', handleImageHover);
      document.addEventListener('mouseout', handleImageLeave);
    } else if (!wasDisabled && isCurrentSiteDisabled) {
      console.log('Image Favicon Preview: Disabled for', hostname);
      cleanup();
      state.isInitialized = true;
    }
  });
}

/**
 * Listens for changes to the global extension enable state
 */
function listenForGlobalEnableChange(): void {
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !('extensionEnabled' in changes)) return;

    const wasGloballyDisabled = isGloballyDisabled;
    isGloballyDisabled = !changes.extensionEnabled.newValue;

    if (wasGloballyDisabled && !isGloballyDisabled) {
      if (!isCurrentSiteDisabled) {
        saveOriginalFavicon();
        checkCustomFavicon();
        document.addEventListener('mouseover', handleImageHover);
        document.addEventListener('mouseout', handleImageLeave);
        document.addEventListener('keydown', handleKeyDown);
      }
    } else if (!wasGloballyDisabled && isGloballyDisabled) {
      cleanup();
      state.isInitialized = true;
    }
  });
}

/**
 * Cleanup function for extension unload
 */
function cleanup(): void {
  console.log('Image Favicon Preview: Cleaning up');

  clearHoverTimeout(state);
  clearRestoreTimeout(state);

  document.removeEventListener('mouseover', handleImageHover);
  document.removeEventListener('mouseout', handleImageLeave);
  document.removeEventListener('keydown', handleKeyDown);

  restoreOriginalFavicon();
  state.isInitialized = false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init().then(() => console.log('Image Favicon Preview: Init complete'));
}

window.addEventListener('beforeunload', cleanup);
