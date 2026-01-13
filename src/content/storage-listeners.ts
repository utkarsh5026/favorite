/**
 * Storage change listeners for extension state
 */
import { saveOriginalFavicon, changeFavicon, restoreOriginalFavicon } from '@/favicons';
import { scriptState, imageLocker } from './state';
import { checkCustomFavicon } from './custom-favicon';
import { addListeners, handleImageHover, handleImageLeave, handleKeyDown } from './handlers';
import type { CustomFavicons } from './types';

const STORAGE_AREA = {
  LOCAL: 'local',
  SYNC: 'sync',
} as const;

// This will be set by initialization module to avoid circular dependencies
let cleanupCallback: (() => void) | null = null;

/**
 * Sets the cleanup callback to be called when disabling
 */
export function setCleanupCallback(callback: () => void): void {
  cleanupCallback = callback;
}

/**
 * Enables extension functionality by setting up event listeners
 */
function enableExtension(withCustomFavicon = false): void {
  saveOriginalFavicon();
  if (withCustomFavicon) {
    checkCustomFavicon();
  }
  addListeners();
}

/**
 * Disables extension functionality
 */
function disableExtension(): void {
  if (cleanupCallback) {
    cleanupCallback();
  }
}

/**
 * Handles unlock messages from popup
 */
function handleLockedImageChange(newValue: unknown): void {
  if (!newValue) {
    imageLocker.handleUnlockFromStorage(scriptState.customFaviconUrl);
  }
}

/**
 * Handles changes to custom favicons
 */
function handleCustomFaviconsChange(icons: CustomFavicons): void {
  const hostname = scriptState.currentHostname;
  if (!hostname) return;

  const icon = icons[hostname];

  if (icon) {
    scriptState.setCustomFaviconUrl(icon.url);
    if (!imageLocker.isImageLocked) {
      changeFavicon(scriptState.customFaviconUrl!);
    }
    return;
  }

  scriptState.setCustomFaviconUrl(null);
  if (!imageLocker.isImageLocked) {
    restoreOriginalFavicon();
  }
}

/**
 * Handles changes to the disabled sites list
 */
function handleDisabledSitesChange(newDisabledSites: string[]): void {
  const hostname = scriptState.currentHostname;
  if (!hostname) return;

  const wasDisabled = scriptState.isCurrentSiteDisabled;
  const isNowDisabled = newDisabledSites.includes(hostname);
  scriptState.setCurrentSiteDisabled(isNowDisabled);

  if (wasDisabled && !isNowDisabled && !scriptState.isGloballyDisabled) {
    enableExtension();
    return;
  }

  if (!wasDisabled && isNowDisabled) {
    console.log('Image Favicon Preview: Disabled for', hostname);
    disableExtension();
  }
}

/**
 * Handles changes to the global extension enable state
 */
function handleExtensionEnabledChange(isEnabled: boolean): void {
  const wasGloballyDisabled = scriptState.isGloballyDisabled;
  const isNowGloballyDisabled = !isEnabled;
  scriptState.setGloballyDisabled(isNowGloballyDisabled);

  if (wasGloballyDisabled && !isNowGloballyDisabled) {
    if (!scriptState.isCurrentSiteDisabled) {
      enableExtension(true);
    }
    return;
  }

  if (!wasGloballyDisabled && isNowGloballyDisabled) {
    disableExtension();
  }
}

/**
 * Main storage change listener that routes to specific handlers
 */
function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
): void {
  if (areaName === STORAGE_AREA.LOCAL) {
    if (changes.lockedImage) {
      handleLockedImageChange(changes.lockedImage.newValue);
    }

    if (changes.customFavicons) {
      handleCustomFaviconsChange((changes.customFavicons.newValue || {}) as CustomFavicons);
    }
    return;
  }

  if (areaName === STORAGE_AREA.SYNC) {
    if (changes.disabledSites) {
      handleDisabledSitesChange(changes.disabledSites.newValue as string[]);
    }

    if (changes.extensionEnabled) {
      handleExtensionEnabledChange(changes.extensionEnabled.newValue as boolean);
    }
  }
}

/**
 * Initializes storage listeners
 */
export function initializeStorageListeners(hostname: string): void {
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  scriptState.setCurrentHostname(hostname);
  chrome.storage.onChanged.addListener(handleStorageChange);
}
