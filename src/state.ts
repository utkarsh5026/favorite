import type { ExtensionConfig, ExtensionState } from './types';

export const CONFIG: ExtensionConfig = {
  hoverDelay: 100,
  restoreDelay: 200,
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
    '[role="img"]'
  ],
  minImageSize: 16,
  faviconShape: 'circle',
  faviconSize: 32
} as const;

export const state: ExtensionState = {
  originalFavicon: null,
  currentHoverTimeout: null,
  currentRestoreTimeout: null,
  isInitialized: false,
  currentHoveredElement: null
};
