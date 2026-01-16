/**
 * Export all transform classes and types
 * These can be used for advanced use cases like transform composition
 */

import { downloadImage, setupCanvas } from '@/utils';
import { RotateTransform, ShapeTransform, FlipTransform } from './classes';
import type { CanvasTransform, FlipDirection, RotationDegrees } from './types';
import type { FaviconShape } from '@/types';

/**
 * Executes a canvas transformation
 * Handles loading the image, setting up the canvas, and converting to data URL
 *
 * @param imageUrl - The source image URL (data URL or http)
 * @param transform - The transformation to apply
 * @returns Data URL of the transformed image
 */
export async function executeTransform(
  imageUrl: string,
  transform: CanvasTransform
): Promise<string> {
  const img = await downloadImage(imageUrl);
  const size = transform.computeSize(img);
  const canvas = setupCanvas(size.width, size.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  transform.apply(ctx, img);
  return canvas.toDataURL('image/png');
}

/**
 * Rotate an image by specified degrees
 * @param imageUrl - Source image URL (data URL or http)
 * @param degrees - Rotation angle (90, 180, or 270)
 * @returns Data URL of rotated image
 */
export async function rotateImage(imageUrl: string, degrees: RotationDegrees): Promise<string> {
  return executeTransform(imageUrl, new RotateTransform(degrees));
}

/**
 * Flip an image horizontally or vertically
 * @param imageUrl - Source image URL
 * @param direction - 'horizontal' or 'vertical'
 * @returns Data URL of flipped image
 */
export async function flipImage(imageUrl: string, direction: FlipDirection): Promise<string> {
  return executeTransform(imageUrl, new FlipTransform(direction));
}

/**
 * Apply a shape mask to an image
 * @param imageUrl - Source image URL
 * @param shape - Shape to apply ('circle', 'rounded', or 'square')
 * @returns Data URL of shaped image
 */
export async function applyShapeToImage(imageUrl: string, shape: FaviconShape): Promise<string> {
  // No transformation needed for square
  if (shape === 'square') {
    return imageUrl;
  }

  return executeTransform(imageUrl, new ShapeTransform(shape));
}
