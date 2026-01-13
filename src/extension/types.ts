/**
 * Shape mask options for favicon display
 */
export type FaviconShape = 'circle' | 'square' | 'rounded';

/**
 * Configuration for the extension behavior
 */
export interface ExtensionConfig {
  /** Delay in milliseconds before changing favicon on hover */
  hoverDelay: number;
  /** Delay in milliseconds before restoring original favicon */
  restoreDelay: number;
  /** CSS selectors for image elements */
  imageSelectors: string[];
  /** Minimum image dimensions to consider (pixels) */
  minImageSize: number;
  /** Shape mask to apply to favicon */
  faviconShape: FaviconShape;
  /** Size of the favicon in pixels */
  faviconSize: number;
}

/**
 * User-configurable settings stored in chrome.storage
 */
export interface UserSettings {
  faviconShape: FaviconShape;
  hoverDelay: number;
  restoreDelay: number;
  faviconSize: number;
  /** List of hostnames where the extension is disabled */
  disabledSites: string[];
  /** Whether the extension is globally enabled */
  extensionEnabled: boolean;
}

/**
 * State management for the extension
 */
export interface ExtensionState {
  /** Original favicon URL to restore later */
  originalFavicon: string | null;
  /** Timeout ID for hover delay */
  currentHoverTimeout: number | null;
  /** Timeout ID for restore delay */
  currentRestoreTimeout: number | null;
  /** Whether the extension has been initialized */
  isInitialized: boolean;
  /** Currently hovered element (for leave detection) */
  currentHoveredElement: Element | null;
  /** ID for the current favicon loading request to prevent race conditions */
  currentLoadingId: number;
}
