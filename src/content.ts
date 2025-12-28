import { CONFIG, state, loadSettings, listenForSettingsChanges, isSiteDisabled } from './state';
import { changeFavicon, saveOriginalFavicon, restoreOriginalFavicon } from './favicon';
import { findImageElement, getImageUrl } from './image';
import type { LockedImage } from './types';

let isCurrentSiteDisabled = false;
let currentHoveredImageUrl: string | null = null;
let isLocked = false;

/**
 * Handles mouseover events to change favicon on hover
 */
function handleImageHover(event: MouseEvent): void {
  if (isCurrentSiteDisabled || isLocked) return;

  clearHoverTimeout();
  clearRestoreTimeout();

  const target = event.target as Element;
  const imageElement = findImageElement(target);

  if (!imageElement) return;

  if (!meetsMinimumSize(imageElement)) return;

  const imageResult = getImageUrl(imageElement);

  if (imageResult && imageResult.url) {
    state.currentHoveredElement = imageElement;
    currentHoveredImageUrl = imageResult.url;

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
  if (isLocked) return;

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
  currentHoveredImageUrl = null;

  state.currentRestoreTimeout = window.setTimeout(() => {
    restoreOriginalFavicon();
    state.currentRestoreTimeout = null;
  }, CONFIG.restoreDelay);
}

/**
 * Locks the current hovered image
 */
async function lockCurrentImage(): Promise<void> {
  if (!currentHoveredImageUrl) return;

  isLocked = true;
  clearRestoreTimeout();

  const lockedImage: LockedImage = {
    url: currentHoveredImageUrl,
    hostname: window.location.hostname,
    timestamp: Date.now()
  };

  await chrome.storage.local.set({ lockedImage });
  showLockNotification(true);
}

/**
 * Unlocks the current image
 */
async function unlockImage(): Promise<void> {
  isLocked = false;
  currentHoveredImageUrl = null;

  await chrome.storage.local.remove('lockedImage');
  restoreOriginalFavicon();
  showLockNotification(false);
}

/**
 * Shows a brief notification when locking/unlocking
 */
function showLockNotification(locked: boolean): void {
  const existingNotification = document.getElementById('favicon-lock-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'favicon-lock-notification';
  notification.textContent = locked ? '🔒 Image locked - Open popup to download' : '🔓 Image unlocked';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${locked ? '#fff' : '#333'};
    color: ${locked ? '#000' : '#fff'};
    padding: 12px 20px;
    border-radius: 8px;
    font-family: 'Cascadia Code', 'Consolas', monospace;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transition: opacity 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Handles keyboard events for lock/unlock
 */
function handleKeyDown(event: KeyboardEvent): void {
  // Press 'L' to lock, 'U' to unlock
  if (event.key.toLowerCase() === 'l' && !isLocked && currentHoveredImageUrl) {
    event.preventDefault();
    lockCurrentImage();
  } else if (event.key.toLowerCase() === 'u' && isLocked) {
    event.preventDefault();
    unlockImage();
  }
}

/**
 * Checks for existing locked image on init
 */
async function checkLockedImage(): Promise<void> {
  const result = await chrome.storage.local.get('lockedImage');
  const lockedImage = result.lockedImage as LockedImage | undefined;

  if (lockedImage && lockedImage.hostname === window.location.hostname) {
    isLocked = true;
    currentHoveredImageUrl = lockedImage.url;
    changeFavicon(lockedImage.url);
  }
}

/**
 * Listens for unlock messages from popup
 */
function listenForUnlockMessage(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.lockedImage) {
      if (!changes.lockedImage.newValue) {
        // Image was unlocked from popup
        isLocked = false;
        currentHoveredImageUrl = null;
        restoreOriginalFavicon();
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

  // Check for existing locked image
  await checkLockedImage();

  document.addEventListener('mouseover', handleImageHover);
  document.addEventListener('mouseout', handleImageLeave);
  document.addEventListener('keydown', handleKeyDown);

  listenForSiteEnableChange(hostname);
  listenForUnlockMessage();

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
  document.removeEventListener('keydown', handleKeyDown);

  restoreOriginalFavicon();
  state.isInitialized = false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', cleanup);
