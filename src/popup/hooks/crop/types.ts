/**
 * Types for the crop tool
 */

import type { RectangleWithPosition } from '@/types';

/**
 * Crop region data representing the selected area to crop
 * All values are in pixels relative to the original image
 */
export type CropData = RectangleWithPosition;

/**
 * Boundary rectangle defining the constrained area for crop selection
 * These are display coordinates (already scaled)
 */
export type BoundaryRect = RectangleWithPosition;


/**
 * Configuration for the crop overlay
 */
export interface CropConfig {
  /** Minimum crop size in pixels */
  minSize: number;
  /** Handle size for hit detection (radius in pixels) */
  handleSize: number;
  /** Handle hit tolerance for easier clicking (radius in pixels) */
  handleTolerance: number;
}

/**
 * Default crop configuration
 */
export const DEFAULT_CROP_CONFIG: CropConfig = {
  minSize: 16,
  handleSize: 6,
  handleTolerance: 12,
};
