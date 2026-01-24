import { useCallback, useRef, useEffect, useMemo } from 'react';
import type { CropData } from './types';
import type { HandlePosition, DragType } from '../editor/types';
import type { Position } from '@/types';
import { useCanvasContext } from '@/popup/canvas';
import { useOverlayDrag } from '../editor';

/**
 * Options for configuring the crop overlay behavior.
 */
interface UseCropOptions {
  /** Minimum allowed size for the crop area in pixels */
  minCropSize: number;
}

/**
 * Custom hook for managing crop overlay interactions including dragging and resizing.
 *
 * Provides drag-and-drop functionality for a crop area overlay on an image canvas,
 * supporting both moving the entire crop area and resizing it via corner/edge handles.
 *
 * The hook initializes the crop area with a 10% margin from image edges and handles
 * all drag operations while maintaining constraints (minimum size, image boundaries).
 *
 * @param options - Configuration options for the crop overlay
 * @param options.minCropSize - Minimum allowed dimensions for the crop area
 * @returns Crop overlay state and drag handlers from useOverlayDrag
 *
 */
export function useCropOverlay({ minCropSize }: UseCropOptions) {
  const { displayScale, imageWidth, imageHeight, canvasRef } = useCanvasContext();

  const crop = useMemo<CropData>(() => {
    const margin = 0.1;
    const w = imageWidth > 0 ? imageWidth : 200;
    const h = imageHeight > 0 ? imageHeight : 200;
    return {
      x: w * margin,
      y: h * margin,
      width: w * (1 - 2 * margin),
      height: h * (1 - 2 * margin),
    };
  }, [imageWidth, imageHeight]);

  const minCropSizeRef = useRef(minCropSize);
  useEffect(() => {
    minCropSizeRef.current = minCropSize;
  });

  /**
   * Converts mouse event coordinates to canvas-relative coordinates.
   *
   * @param e - Mouse event from drag interaction
   * @param containerRef - Reference to the canvas container element
   * @returns Position with x,y coordinates relative to the canvas
   */
  const getMousePos = useCallback(
    (e: MouseEvent, containerRef: React.RefObject<HTMLElement | null>): Position => {
      const canvas = containerRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  /**
   * Computes the new crop area based on drag interaction.
   *
   * Handles both moving the entire crop area and resizing via edge/corner handles.
   * Applies display scaling and ensures the result stays within image bounds.
   *
   * @param dragType - Type of drag operation ('move' or handle position like 'nw', 'se', etc.)
   * @param delta - Mouse movement delta in canvas coordinates
   * @param startState - Initial crop state before drag began
   * @returns New crop data with constraints applied
   */
  const computeDragResult = useCallback(
    (dragType: DragType, delta: Position, startState: CropData): CropData => {
      const min = minCropSizeRef.current;

      const dx = delta.x / displayScale;
      const dy = delta.y / displayScale;

      if (dragType === 'move') {
        const { x, y } = startState;
        return constrainCrop({ ...startState, x: x + dx, y: y + dy }, imageHeight, imageWidth, min);
      }

      const type = dragType || ('' as HandlePosition);
      const updates = resizeCrop(type, startState, dx, dy, imageHeight, imageWidth, min);
      return constrainCrop({ ...startState, ...updates }, imageHeight, imageWidth, min);
    },
    [displayScale, imageWidth, imageHeight]
  );

  return useOverlayDrag<CropData>({
    initialState: crop,
    onDragMove: computeDragResult,
    containerRef: canvasRef,
    getMousePosition: getMousePos,
  });
}

/**
 * Constrains crop dimensions and position to stay within image bounds.
 *
 * Ensures the crop area:
 * - Has minimum required dimensions
 * - Doesn't exceed image dimensions
 * - Stays completely within the image boundaries
 *
 * @param data - Crop data to constrain
 * @param imageHeight - Height of the source image
 * @param imageWidth - Width of the source image
 * @param minCropSize - Minimum allowed crop dimension
 * @returns Constrained crop data
 */
function constrainCrop(
  data: CropData,
  imageHeight: number,
  imageWidth: number,
  minCropSize: number
): CropData {
  let { x: cx, y: cy, width: cw, height: ch } = data;
  cw = clamp(cw, minCropSize, imageWidth);
  ch = clamp(ch, minCropSize, imageHeight);
  cx = clamp(cx, 0, imageWidth - cw);
  cy = clamp(cy, 0, imageHeight - ch);
  return { x: cx, y: cy, width: cw, height: ch };
}

/**
 * Calculates crop updates based on handle position and drag delta.
 *
 * Supports 8 resize handles (cardinal and ordinal directions):
 * - Cardinal: 'n', 's', 'e', 'w'
 * - Ordinal: 'ne', 'nw', 'se', 'sw'
 *
 * Each handle can contain multiple direction indicators (e.g., 'nw' includes both 'n' and 'w').
 *
 * @param handle - Position of the resize handle being dragged
 * @param start - Initial crop state before resize
 * @param dx - Horizontal drag delta in image coordinates
 * @param dy - Vertical drag delta in image coordinates
 * @param imageHeight - Height of the source image
 * @param imageWidth - Width of the source image
 * @param min - Minimum allowed crop dimension
 * @returns Partial crop data containing only the changed properties
 */
function resizeCrop(
  handle: HandlePosition,
  start: CropData,
  dx: number,
  dy: number,
  imageHeight: number,
  imageWidth: number,
  min: number
): Partial<CropData> {
  const { x, y, width, height } = start;
  let updates: Partial<CropData> = {};

  if (handle.includes('n')) {
    const bottom = y + height;
    const clampedTop = Math.max(0, y + dy);
    const clampedHeight = Math.max(min, bottom - clampedTop);
    updates = { ...updates, y: bottom - clampedHeight, height: clampedHeight };
  }

  if (handle.includes('s')) {
    const clampedHeight = Math.max(min, Math.min(height + dy, imageHeight - y));
    updates = { ...updates, height: clampedHeight };
  }

  if (handle.includes('w')) {
    const right = x + width;
    const clampedLeft = Math.max(0, x + dx);
    const clampedWidth = Math.max(min, right - clampedLeft);
    updates = { ...updates, x: right - clampedWidth, width: clampedWidth };
  }

  if (handle.includes('e')) {
    const clampedWidth = Math.max(min, Math.min(width + dx, imageWidth - x));
    updates = { ...updates, width: clampedWidth };
  }

  return updates;
}

/**
 * Clamps a value between minimum and maximum bounds.
 *
 * @param value - Value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Value constrained to [min, max] range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
