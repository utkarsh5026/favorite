import type { ExtensionConfig, ExtensionState, UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  faviconShape: 'circle',
  hoverDelay: 100,
  restoreDelay: 200,
  faviconSize: 32,
  disabledSites: [],
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
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve();
      return;
    }

    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      const settings = result as UserSettings;
      CONFIG.faviconShape = settings.faviconShape;
      CONFIG.hoverDelay = settings.hoverDelay;
      CONFIG.restoreDelay = settings.restoreDelay;
      CONFIG.faviconSize = settings.faviconSize;
      resolve();
    });
  });
}

/**
 * Listens for settings changes and updates CONFIG in real-time
 */
export function listenForSettingsChanges(onShapeOrSizeChange?: () => void): void {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;

    let shouldRefresh = false;

    if (changes.faviconShape) {
      CONFIG.faviconShape = changes.faviconShape.newValue;
      shouldRefresh = true;
    }
    if (changes.hoverDelay) {
      CONFIG.hoverDelay = changes.hoverDelay.newValue;
    }
    if (changes.restoreDelay) {
      CONFIG.restoreDelay = changes.restoreDelay.newValue;
    }
    if (changes.faviconSize) {
      CONFIG.faviconSize = changes.faviconSize.newValue;
      shouldRefresh = true;
    }

    if (shouldRefresh && onShapeOrSizeChange) {
      onShapeOrSizeChange();
    }
  });
}

/**
 * Checks if the extension is disabled for a given hostname
 */
export async function isSiteDisabled(hostname: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve(false);
      return;
    }

    chrome.storage.sync.get({ disabledSites: [] }, (result) => {
      const disabledSites = result.disabledSites as string[];
      resolve(disabledSites.includes(hostname));
    });
  });
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
