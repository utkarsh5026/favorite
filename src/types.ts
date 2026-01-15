/**
 * Shape mask options for favicon display
 */
export type FaviconShape = 'circle' | 'square' | 'rounded';

/**
 * Types of images that can be extracted
 */
export type ImageType = 'img' | 'svg' | 'picture' | 'background' | 'canvas';

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
 * Favicon state for a site - tracks original and current favicon
 */
export interface FaviconState {
  /** The website's original favicon URL */
  original: string;
  /** The currently active favicon URL (can be same as original or custom) */
  current: string;
  /** Timestamp when current was last updated */
  timestamp: number;
}

/**
 * Map of hostnames to their favicon states
 */
export type FaviconStates = Record<string, FaviconState>;

/**
 * Custom favicon entry for a site
 */
export interface CustomFavicon {
  /** The custom favicon URL */
  url: string;
  /** Timestamp when the custom favicon was set */
  timestamp: number;
}

/**
 * Map of hostnames to their custom favicons
 */
export type CustomFavicons = Record<string, CustomFavicon>;

/**
 * Context menu action types
 */
export type ContextMenuAction = 'setDefault' | 'download' | 'edit' | 'preview';

/**
 * History entry for a previewed/locked favicon
 */
export interface HistoryEntry {
  /** Thumbnail data URL (64x64, JPEG quality 0.7) */
  thumbnail: string;
  /** Original image URL (for re-application) */
  originalUrl: string;
  /** Timestamp when previewed/locked */
  timestamp: number;
  /** Type of action that created this entry */
  source: 'hover' | 'upload';
}

/**
 * History for a specific site
 */
export interface SiteHistory {
  /** Hostname this history belongs to */
  hostname: string;
  /** History entries, newest first */
  entries: HistoryEntry[];
}

/**
 * Map of hostnames to site histories
 */
export type FaviconHistory = Record<string, SiteHistory>;

/**
 * Message sent from background to content script for context menu actions
 */
export interface ContextMenuMessage {
  type: 'contextMenuAction';
  action: ContextMenuAction;
  imageUrl: string;
  hostname: string;
}

/**
 * Response from content script to background
 */
export interface ContentScriptResponse {
  success: boolean;
  error?: string;
}

/**
 * Live preview message sent from content script to popup via background
 */
export interface LivePreviewMessage {
  type: 'hover-update';
  imageUrl: string | null;
  /** Pre-processed 64px image data URL ready for display (includes shape masking) */
  processedImageUrl?: string;
  imageInfo?: {
    width: number;
    height: number;
    imageType: string;
  };
}
