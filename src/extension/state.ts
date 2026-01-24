import type { ExtensionConfig, ExtensionState, UserSettings } from './types';
import { getItem, getItems } from './storage';

export const DEFAULT_SETTINGS: UserSettings = {
  faviconShape: 'circle',
  hoverDelay: 100,
  restoreDelay: 200,
  faviconSize: 32,
  disabledSites: [],
  extensionEnabled: true,
};

export const CONFIG: ExtensionConfig = {
  hoverDelay: DEFAULT_SETTINGS.hoverDelay,
  restoreDelay: DEFAULT_SETTINGS.restoreDelay,
  imageSelectors: [
    'img',
    'svg',
    'picture',
    'canvas',
    '[style*="background-image"]',
    '[class*="image"]',
    '[class*="img"]',
    '[class*="photo"]',
    '[class*="thumbnail"]',
    '[class*="avatar"]',
    '[class*="logo"]',
    'figure',
    '.icon',
    '[role="img"]',
  ],
  minImageSize: 16,
  faviconShape: DEFAULT_SETTINGS.faviconShape,
  faviconSize: DEFAULT_SETTINGS.faviconSize,
};

export const state: ExtensionState = {
  originalFavicon: null,
  currentHoverTimeout: null,
  currentRestoreTimeout: null,
  isInitialized: false,
  currentHoveredElement: null,
  currentLoadingId: 0,
};

/**
 * Loads user settings from chrome. Storage and updates CONFIG
 */
export async function loadSettings(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return;
  }

  const keys = Object.keys(DEFAULT_SETTINGS);
  const result = await getItems<UserSettings>(keys, 'sync', 'Failed to load settings');
  const { faviconShape, faviconSize, hoverDelay, restoreDelay } = {
    ...DEFAULT_SETTINGS,
    ...result,
  };

  CONFIG.faviconShape = faviconShape;
  CONFIG.hoverDelay = hoverDelay;
  CONFIG.restoreDelay = restoreDelay;
  CONFIG.faviconSize = faviconSize;
}

/**
 * Checks if the extension is disabled for a given hostname
 */
export async function isSiteDisabled(hostname: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return false;
  }

  const disabledSites = await getItem<string[]>('disabledSites', [], 'sync');
  return disabledSites.includes(hostname) ?? false;
}

/**
 * Checks if the extension is globally enabled
 */
export async function isExtensionEnabled(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return true;
  }

  return getItem('extensionEnabled', true, 'sync');
}

/**
 * Clears any pending restore timeout
 */
export function clearRestoreTimeout(state: ExtensionState): void {
  if (state.currentRestoreTimeout !== null) {
    clearTimeout(state.currentRestoreTimeout);
    state.currentRestoreTimeout = null;
  }
}

/**
 * Clears any pending hover timeout
 */
export function clearHoverTimeout(state: ExtensionState): void {
  if (state.currentHoverTimeout !== null) {
    clearTimeout(state.currentHoverTimeout);
    state.currentHoverTimeout = null;
  }
}
