/**
 * Universal data URL conversion utilities
 * Provides overloaded functions to convert images to data URLs
 */

import { downloadImage, setupCanvas } from '@/utils';

const IMAGE_MIME_TYPE = 'image/png';

export type DataUrlOptions = {
  /** Target width (defaults to image natural width) */
  width?: number;
  /** Target height (defaults to image natural height) */
  height?: number;
  /** Single size for both width and height (creates a square, overrides width/height) */
  size?: number;
  /** Image quality for lossy formats (0-1, default: 1) */
  quality?: number;
  /** MIME type for output (default: image/png) */
  mimeType?: string;
};

type DataUrlResult = {
  url: string;
  error?: string;
};

/**
 * Converts an HTMLImageElement to a data URL
 * @param image - The image element to convert
 * @param options - Optional configuration for output dimensions and quality
 * @returns The data URL string
 * @throws Error if image is not loaded or canvas context fails
 */
export function toDataUrl(image: HTMLImageElement, options?: DataUrlOptions): string;

/**
 * Converts an image URL to a data URL
 * @param url - The URL of the image to convert (can be a regular URL or existing data URL)
 * @param options - Optional configuration for output dimensions and quality
 * @returns Promise resolving to a result object with url and optional error
 */
export function toDataUrl(url: string, options?: DataUrlOptions): Promise<DataUrlResult>;

/**
 * Implementation of the overloaded toDataUrl function
 */
export function toDataUrl(
  source: HTMLImageElement | string,
  options?: DataUrlOptions
): string | Promise<DataUrlResult> {
  if (typeof source === 'string') {
    return convertUrlToDataUrl(source, options);
  }
  return convertImageToDataUrl(source, options);
}

/**
 * Converts an HTMLImageElement to a data URL synchronously
 */
function convertImageToDataUrl(image: HTMLImageElement, options?: DataUrlOptions): string {
  if (!image.complete || !image.naturalWidth) {
    throw new Error('Image is not fully loaded');
  }

  const { width, height } = resolveOutputDimensions(
    image.naturalWidth,
    image.naturalHeight,
    options
  );

  const mimeType = options?.mimeType ?? IMAGE_MIME_TYPE;
  const quality = options?.quality ?? 1;

  const canvas = setupCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL(mimeType, quality);
}

/**
 * Converts an image URL to a data URL asynchronously
 */
async function convertUrlToDataUrl(url: string, options?: DataUrlOptions): Promise<DataUrlResult> {
  if (url.startsWith('data:') && !options?.size && !options?.width && !options?.height) {
    return { url };
  }

  try {
    const image = await downloadImage(url);
    const dataUrl = convertImageToDataUrl(image, options);
    return { url: dataUrl };
  } catch (error) {
    return {
      url: '',
      error: error instanceof Error ? error.message : 'Failed to convert image',
    };
  }
}

/**
 * Resolves the output dimensions based on options and source dimensions
 */
function resolveOutputDimensions(
  sourceWidth: number,
  sourceHeight: number,
  options?: DataUrlOptions
): { width: number; height: number } {
  if (options?.size) {
    return { width: options.size, height: options.size };
  }

  return {
    width: options?.width ?? sourceWidth,
    height: options?.height ?? sourceHeight,
  };
}
