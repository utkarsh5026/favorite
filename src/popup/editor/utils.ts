/**
 * Image transformation utilities for the editor
 * Uses canvas for rotate, flip, and shape operations
 * Implements the Command Pattern for better extensibility
 */

import { downloadImage, setupCanvas } from '@/utils';

/**
 * Convert an image URL to a data URL
 * If already a data URL, returns as-is
 */
export async function loadImageAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url;
  }

  const img = await downloadImage(url);
  const canvas = setupCanvas(img.naturalWidth, img.naturalHeight);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Get the dimensions of an image from its URL
 */
export async function getImageDimensions(
  imageUrl: string
): Promise<{ width: number; height: number }> {
  const img = await downloadImage(imageUrl);
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}
