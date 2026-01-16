/**
 * Types for the crop tool
 */

/**
 * Crop region data representing the selected area to crop
 * All values are in pixels relative to the original image
 */
export interface CropData {
  /** X position (left edge) in pixels */
  x: number;
  /** Y position (top edge) in pixels */
  y: number;
  /** Width of the crop region in pixels */
  width: number;
  /** Height of the crop region in pixels */
  height: number;
}

/**
 * Handle position identifiers for the crop overlay
 * - n, s, e, w: Edge handles (north, south, east, west)
 * - nw, ne, sw, se: Corner handles
 */
export type HandlePosition = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

/**
 * Types of drag operations
 */
export type DragType = 'move' | HandlePosition | null;

/**
 * Mouse position in pixels
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Boundary rectangle defining the constrained area for crop selection
 * These are display coordinates (already scaled)
 */
export interface BoundaryRect {
  /** X position of the image in the container */
  x: number;
  /** Y position of the image in the container */
  y: number;
  /** Display width of the image */
  width: number;
  /** Display height of the image */
  height: number;
}

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
