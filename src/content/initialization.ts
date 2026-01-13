/**
 * Initialization and cleanup logic for content script
 */
import {
  state,
  loadSettings,
  listenForSettingsChanges,
  isSiteDisabled,
  isExtensionEnabled,
  clearHoverTimeout,
  clearRestoreTimeout,
} from '@/extension';
import { saveOriginalFavicon, restoreOriginalFavicon } from '@/favicons';
import { scriptState, imageLocker } from './state';
import { addListeners, removeListeners } from './handlers';
import {
  checkCustomFavicon,
  refreshCurrentFavicon,
} from './custom-favicon';
import {
  initializeStorageListeners,
  setCleanupCallback,
} from './storage-listeners';

/**
 * Cleanup function for extension unload
 */
export function cleanup(): void {
  console.log('Image Favicon Preview: Cleaning up');

  clearHoverTimeout(state);
  clearRestoreTimeout(state);

  removeListeners();
  restoreOriginalFavicon();
  state.isInitialized = false;
}

/**
 * Checks if the extension is globally disabled
 * @returns Promise that resolves to true if globally disabled, false otherwise
 */
async function isGloballyDiabled(): Promise<boolean> {
  const extensionEnabled = await isExtensionEnabled();
  scriptState.setGloballyDisabled(!extensionEnabled);

  if (scriptState.isGloballyDisabled) {
    console.log('Image Favicon Preview: Extension is globally disabled');
    state.isInitialized = true;
    return true;
  }

  return false;
}

/**
 * Checks if the extension is disabled for the current site
 * @param hostname - The hostname of the current site
 * @returns Promise that resolves to true if disabled for the site, false otherwise
 */
async function isDisabled(hostname: string) {
  const siteDisabled = await isSiteDisabled(hostname);
  scriptState.setCurrentSiteDisabled(siteDisabled);

  if (scriptState.isCurrentSiteDisabled) {
    console.log('Image Favicon Preview: Disabled for', hostname);
    state.isInitialized = true;
    return true;
  }

  return false;
}

/**
 * Initializes the content script
 */
export async function init(): Promise<void> {
  if (state.isInitialized) {
    console.warn('Image Favicon Preview: Already initialized');
    return;
  }

  await loadSettings();

  const hostname = window.location.hostname;

  // Initialize storage listeners early so they can detect re-enabling
  initializeStorageListeners(hostname);

  if ((await isGloballyDiabled()) || (await isDisabled(hostname))) {
    return;
  }

  console.log('Image Favicon Preview: Extension loaded on', hostname);

  saveOriginalFavicon();

  await checkCustomFavicon();
  await imageLocker.checkAndInitialize();

  listenForSettingsChanges(refreshCurrentFavicon);
  addListeners();

  setCleanupCallback(cleanup);

  state.isInitialized = true;
}
