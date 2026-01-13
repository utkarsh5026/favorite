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
 * Types of images that can be extracted
 */
export type ImageType = 'img' | 'svg' | 'picture' | 'background' | 'canvas';
