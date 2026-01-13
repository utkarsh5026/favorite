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

/**
 * Context menu action types
 */
export type ContextMenuAction = 'preview' | 'lock' | 'setDefault' | 'download';

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
  source: 'preview' | 'lock' | 'upload';
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
  imageInfo?: {
    width: number;
    height: number;
    imageType: string;
  };
}
