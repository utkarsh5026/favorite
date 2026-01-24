import type { FaviconShape } from '@/types';

// Re-export shared types from overlay module
export type { HandlePosition, DragType, } from '../overlay/types';
export { HANDLE_POSITIONS, HANDLE_CURSORS } from '../overlay/types';

/**
 * Shape manipulation data - stores position and scale for shape overlay.
 * Uses normalized coordinates (0-1) for image-size independence.
 */
export interface ShapeManipulationData {
  /** Shape type */
  shape: FaviconShape;
  /** Center X position (0-1 normalized, 0.5 = center) */
  centerX: number;
  /** Center Y position (0-1 normalized, 0.5 = center) */
  centerY: number;
  /** Scale factor (1.0 = fits image, 0.5 = half size, 2.0 = double) */
  scale: number;
}

/** Default shape manipulation - centered, full size */
export const DEFAULT_SHAPE_MANIPULATION: Omit<ShapeManipulationData, 'shape'> = {
  centerX: 0.5,
  centerY: 0.5,
  scale: 1.0,
};

/** Shape constraints */
export const SHAPE_CONSTRAINTS = {
  /** Minimum scale (10% of image size) */
  minScale: 0.1,
  /** Maximum scale (100% - shape must fit within image bounds) */
  maxScale: 1.0,
} as const;
