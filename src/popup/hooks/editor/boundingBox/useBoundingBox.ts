import { useCallback, useMemo } from 'react';
import type { Position } from '@/types';
import type { BoundingBox, BoundingBoxConfig, DragType, DisplayBoundingBox } from './types';
import { moveBox, resizeBox, constrainBox, type FullBoundingBoxConfig } from './constraints';
import { useOverlayDrag } from '../useOverlayDrag';
import { useCanvasContext } from '@/popup/canvas';

export interface UseBoundingBoxOptions {
  /** Initial bounding box in image pixels */
  initialBox: BoundingBox;
  /** Configuration for constraints */
  config: BoundingBoxConfig;
}

export interface UseBoundingBoxReturn {
  /** Current bounding box in image pixels */
  box: BoundingBox;
  /** Display bounding box (left, top, width, height in display pixels) */
  displayBox: DisplayBoundingBox;
  /** Whether dragging is in progress */
  isDragging: boolean;
  /** Current drag type */
  dragType: DragType;
  /** Start a drag operation */
  startDrag: (e: React.MouseEvent, type: DragType) => void;
  /** Reset to initial box */
  reset: () => void;
  /** Manually set the box */
  setBox: React.Dispatch<React.SetStateAction<BoundingBox>>;
}

/**
 * Hook for managing a bounding box with drag/resize operations.
 * Supports both free aspect ratio (crop) and locked aspect ratio (shapes).
 */
export function useBoundingBox({
  initialBox,
  config,
}: UseBoundingBoxOptions): UseBoundingBoxReturn {
  const { displayScale, imageWidth, imageHeight, canvasRef, getBoundary } = useCanvasContext();

  const fullConfig = useMemo<FullBoundingBoxConfig>(
    () => ({
      ...config,
      imageBounds: { width: imageWidth, height: imageHeight },
    }),
    [config, imageWidth, imageHeight]
  );

  const constrainedInitialBox = useMemo(
    () => constrainBox(initialBox, fullConfig),
    [initialBox, fullConfig]
  );

  // Get mouse position relative to container
  const getMousePosition = useCallback(
    (e: MouseEvent, ref: React.RefObject<HTMLElement | null>): Position => {
      const container = ref.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  const handleDragMove = useCallback(
    (dragType: DragType, delta: Position, startState: BoundingBox): BoundingBox => {
      const dx = delta.x / displayScale;
      const dy = delta.y / displayScale;

      if (dragType === 'move') {
        return moveBox(startState, dx, dy, fullConfig);
      }

      if (dragType !== null) {
        return resizeBox(dragType, startState, dx, dy, fullConfig);
      }

      return startState;
    },
    [displayScale, fullConfig]
  );

  const {
    state: box,
    isDragging,
    dragType,
    startDrag,
    resetState: reset,
    setState: setBox,
  } = useOverlayDrag<BoundingBox>({
    initialState: constrainedInitialBox,
    onDragMove: handleDragMove,
    containerRef: canvasRef,
    getMousePosition,
  });

  const displayBox = useMemo<DisplayBoundingBox>(() => {
    const boundary = getBoundary();
    return {
      left: boundary.x + box.x * displayScale,
      top: boundary.y + box.y * displayScale,
      width: box.width * displayScale,
      height: box.height * displayScale,
    };
  }, [box, displayScale, getBoundary]);

  return {
    box,
    displayBox,
    isDragging,
    dragType,
    startDrag,
    reset,
    setBox,
  };
}
