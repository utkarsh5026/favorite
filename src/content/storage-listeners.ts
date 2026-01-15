/**
 * Storage change listeners for extension state
 */
import { saveOriginalFavicon, changeFavicon } from '@/favicons';
import type { FaviconStates } from '@/types';
import { scriptState } from './state';
import { addListeners } from './handlers';

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
function enableExtension(): void {
  saveOriginalFavicon();
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
 * Handles changes to favicon states storage
 */
function handleFaviconStatesChange(newStates: FaviconStates | undefined): void {
  const hostname = scriptState.currentHostname;
  if (!hostname || !newStates) return;

  const state = newStates[hostname];
  if (state && state.current) {
    changeFavicon(state.current, false);
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
      enableExtension();
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
    if (changes.faviconStates) {
      handleFaviconStatesChange(changes.faviconStates.newValue as FaviconStates | undefined);
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
