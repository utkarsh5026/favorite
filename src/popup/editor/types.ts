/**
 * Types for the image editor
 */

import type { FaviconShape } from '@/types';

/**
 * State of the image editor
 */
export interface EditorState {
  /** Original image URL (data URL or http) */
  originalImageUrl: string | null;
  /** Current transformed image as data URL */
  currentImageUrl: string | null;
  /** History stack for undo (array of image data URLs) */
  historyStack: string[];
  /** Current position in history stack */
  historyIndex: number;
  /** Maximum history entries to keep */
  maxHistorySize: number;
  /** Current shape for preview and export */
  currentShape: FaviconShape;
}

/**
 * Pending edit image data stored in chrome.storage.local
 */
export interface PendingEditImage {
  /** The image URL to edit */
  imageUrl: string;
  /** Hostname where the image was selected */
  hostname: string;
  /** Timestamp when the edit was requested */
  timestamp: number;
}
