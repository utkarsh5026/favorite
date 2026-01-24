import { useCallback, useRef, useMemo } from 'react';
import type { FaviconShape } from '@/types';
import { useCanvasContext } from '@/popup/canvas';
import { useOverlayDrag } from '../editor/useOverlayDrag';
import type { DragType, DisplayBoundingBox } from '@/popup/editor/overlay/types';
import type { Position } from '@/types';
import type { ShapeManipulationData } from '@/popup/editor/shapes/types';
import { DEFAULT_SHAPE_MANIPULATION, SHAPE_CONSTRAINTS } from '@/popup/editor/shapes/types';

/** Internal state type (excludes shape from ShapeManipulationData) */
type ManipulationState = Omit<ShapeManipulationData, 'shape'>;

interface UseShapeOverlayOptions {
  /** Shape type being manipulated */
  shape: FaviconShape;
  /** Initial manipulation state (optional, defaults to centered at scale 1.0) */
  initialManipulation?: ShapeManipulationData | null;
}

interface UseShapeOverlayReturn {
  /** Current manipulation state (centerX, centerY, scale) */
  state: ManipulationState;
  /** Whether a drag is in progress */
  isDragging: boolean;
  /** Start a drag operation */
  startDrag: (e: React.MouseEvent, type: DragType) => void;
  /** Bounding box in display coordinates for rendering */
  displayBox: DisplayBoundingBox;
  /** Ref to attach to the selection box element */
  selectionRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook for shape manipulation overlay.
 * Handles drag/resize operations for shape positioning and scaling.
 */
export function useShapeOverlay({
  shape,
  initialManipulation,
}: UseShapeOverlayOptions): UseShapeOverlayReturn {
  const {
    displayScale,
    imageWidth,
    imageHeight,
    containerRef: canvasContainerRef,
  } = useCanvasContext();

  const selectionRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });

  // Compute initial state from existing manipulation or defaults
  const initialState = useMemo<ManipulationState>(() => {
    if (initialManipulation && initialManipulation.shape === shape) {
      return {
        centerX: initialManipulation.centerX,
        centerY: initialManipulation.centerY,
        scale: initialManipulation.scale,
      };
    }
    return { ...DEFAULT_SHAPE_MANIPULATION };
  }, [initialManipulation, shape]);

  // Get mouse position relative to canvas container
  const getMousePosition = useCallback(
    (e: MouseEvent): Position => {
      const container = canvasContainerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [canvasContainerRef]
  );

  // Handle drag move - compute new state from delta
  const handleDragMove = useCallback(
    (dragType: DragType, delta: Position, startState: ManipulationState): ManipulationState => {
      // Handle move: apply normalized delta to position
      if (dragType === 'move') {
        const dx = displayToNormalized(delta.x, imageWidth, displayScale);
        const dy = displayToNormalized(delta.y, imageHeight, displayScale);

        return {
          ...startState,
          centerX: constrainPosition(startState.centerX + dx, startState.scale),
          centerY: constrainPosition(startState.centerY + dy, startState.scale),
        };
      }

      // Handle resize: calculate scale from distance to center
      const bbox = getShapeBoundingBox(
        startState.centerX,
        startState.centerY,
        startState.scale,
        imageWidth,
        imageHeight,
        displayScale
      );

      const centerDisplayX = bbox.left + bbox.width / 2;
      const centerDisplayY = bbox.top + bbox.height / 2;

      const startDist = getDistance(
        dragStartRef.current.x,
        dragStartRef.current.y,
        centerDisplayX,
        centerDisplayY
      );

      const currentX = dragStartRef.current.x + delta.x;
      const currentY = dragStartRef.current.y + delta.y;
      const currentDist = getDistance(currentX, currentY, centerDisplayX, centerDisplayY);

      if (startDist > 0) {
        return {
          ...startState,
          scale: calculateScaleFromDrag(startDist, currentDist, startState.scale),
        };
      }

      return startState;
    },
    [displayScale, imageWidth, imageHeight]
  );

  const {
    state,
    isDragging,
    startDrag: originalStartDrag,
  } = useOverlayDrag<ManipulationState>({
    initialState,
    onDragMove: handleDragMove,
    containerRef: selectionRef,
    getMousePosition,
  });

  // Wrapped startDrag that captures absolute position for scale calculation
  const startDrag = useCallback(
    (e: React.MouseEvent, type: DragType) => {
      const container = canvasContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        dragStartRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
      originalStartDrag(e, type);
    },
    [originalStartDrag, canvasContainerRef]
  );

  // Compute display bounding box for rendering
  const displayBox = useMemo<DisplayBoundingBox>(
    () =>
      getShapeBoundingBox(
        state.centerX,
        state.centerY,
        state.scale,
        imageWidth,
        imageHeight,
        displayScale
      ),
    [state.centerX, state.centerY, state.scale, imageWidth, imageHeight, displayScale]
  );

  return {
    state,
    isDragging,
    startDrag,
    displayBox,
    selectionRef,
  };
}


/**
 * Convert normalized coordinate (0-1) to display pixels.
 * @param normalized - Normalized coordinate (0-1)
 * @param imageSize - Image dimension in pixels
 * @param displayScale - Display scale factor (displaySize / imageSize)
 */
export function normalizedToDisplay(
  normalized: number,
  imageSize: number,
  displayScale: number
): number {
  return normalized * imageSize * displayScale;
}

/**
 * Convert display pixels to normalized coordinate (0-1).
 * @param display - Display coordinate in pixels
 * @param imageSize - Image dimension in pixels
 * @param displayScale - Display scale factor (displaySize / imageSize)
 */
export function displayToNormalized(
  display: number,
  imageSize: number,
  displayScale: number
): number {
  return display / (imageSize * displayScale);
}

/**
 * Constrain scale within min/max bounds.
 * @param scale - Scale value to constrain
 */
export function constrainScale(scale: number): number {
  return Math.max(SHAPE_CONSTRAINTS.minScale, Math.min(SHAPE_CONSTRAINTS.maxScale, scale));
}

/**
 * Constrain center position to keep shape partially visible.
 * Allows center to go slightly out of bounds for edge positioning.
 * @param position - Position (0-1 normalized)
 * @param scale - Current scale
 */
export function constrainPosition(position: number, scale: number): number {
  const halfShape = scale / 2;
  const minPos = -halfShape + 0.1; // Keep at least 10% visible
  const maxPos = 1 + halfShape - 0.1;
  return Math.max(minPos, Math.min(maxPos, position));
}

/**
 * Calculate the bounding box for the shape in display coordinates.
 */
export function getShapeBoundingBox(
  centerX: number,
  centerY: number,
  scale: number,
  imageWidth: number,
  imageHeight: number,
  displayScale: number
): { left: number; top: number; width: number; height: number } {
  const displayCenterX = normalizedToDisplay(centerX, imageWidth, displayScale);
  const displayCenterY = normalizedToDisplay(centerY, imageHeight, displayScale);

  // Shape is always square (uses min dimension)
  const baseSize = Math.min(imageWidth, imageHeight);
  const shapeSize = baseSize * scale * displayScale;

  return {
    left: displayCenterX - shapeSize / 2,
    top: displayCenterY - shapeSize / 2,
    width: shapeSize,
    height: shapeSize,
  };
}

/**
 * Calculate scale from diagonal distance (for corner handle drag).
 */
export function calculateScaleFromDrag(
  startDist: number,
  currentDist: number,
  startScale: number
): number {
  if (startDist === 0) return startScale;
  const scaleDelta = currentDist / startDist;
  return constrainScale(startScale * scaleDelta);
}

/**
 * Get distance between two points.
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}