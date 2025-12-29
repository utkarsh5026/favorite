/**
 * Shape mask options for favicon display
 */
export type FaviconShape = 'circle' | 'square' | 'rounded';

/**
 * Types of images that can be extracted
 */
export type ImageType = 'img' | 'svg' | 'picture' | 'background' | 'canvas';

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
}

/**
 * Result of image URL extraction
 */
export interface ImageExtractionResult {
  /** The extracted URL (can be data URL or http URL) */
  url: string;
  /** Type of image source */
  type: ImageType;
  /** Whether the URL is a data URL */
  isDataUrl: boolean;
}

/**
 * Locked image data stored in chrome.storage.local
 */
export interface LockedImage {
  /** The image URL */
  url: string;
  /** Hostname where the image was locked */
  hostname: string;
  /** Timestamp when the image was locked */
  timestamp: number;
}

/**
 * Custom favicon for a specific site
 */
export interface CustomFavicon {
  /** The favicon image URL (data URL for persistence) */
  url: string;
  /** Timestamp when the favicon was set */
  timestamp: number;
}

/**
 * Map of hostnames to custom favicons
 */
export type CustomFavicons = Record<string, CustomFavicon>;
