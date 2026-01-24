import type { HandlePosition, DragType } from '@/popup/editor/overlay/types';
import { RectangleWithPosition } from '@/types';

// Re-export for convenience
export type { HandlePosition, DragType };

/**
 * Bounding box in image pixel coordinates.
 * This is the unified format for manipulation operations.
 */
export type BoundingBox = RectangleWithPosition;
/**
 * Aspect ratio constraint for the bounding box.
 * - null: No constraint (free resize like crop)
 * - number: Fixed ratio (e.g., 1 for square shapes)
 */
export type AspectRatioConstraint = number | null;

/**
 * Configuration for bounding box behavior.
 */
export interface BoundingBoxConfig {
  /** Minimum size in image pixels */
  minSize: number;
  /** Aspect ratio constraint (null = free, 1 = square) */
  aspectRatio: AspectRatioConstraint;
}

/** Bounding box in display coordinates */
export interface DisplayBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}
