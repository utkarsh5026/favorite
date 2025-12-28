/**
 * Configuration for the extension behavior
 */
export interface ExtensionConfig {
  /** Delay in milliseconds before changing favicon on hover */
  readonly hoverDelay: number;
  /** Delay in milliseconds before restoring original favicon */
  readonly restoreDelay: number;
  /** CSS selectors for image elements */
  readonly imageSelectors: readonly string[];
  /** Minimum image dimensions to consider (pixels) */
  readonly minImageSize: number;
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
  type: 'img' | 'svg' | 'picture' | 'background' | 'canvas';
  /** Whether the URL is a data URL */
  isDataUrl: boolean;
}
