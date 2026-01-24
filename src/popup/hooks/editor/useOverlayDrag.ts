import { useState, useRef, useCallback, useEffect } from 'react';
import type { DragType, Point } from '@/popup/editor/overlay/types';
import { addListeners } from '@/utils';

export interface UseOverlayDragOptions<TState> {
  /** Initial state for the overlay */
  initialState: TState;
  /** Called during drag to compute new state from delta */
  onDragMove: (dragType: DragType, delta: Point, startState: TState) => TState;
  /** Called to get mouse position relative to container */
  getMousePosition: (
    e: MouseEvent,
    containerRef: React.RefObject<HTMLElement | null>
  ) => Point;
  /** Container element ref for coordinate calculations */
  containerRef: React.RefObject<HTMLElement | null>;
}

export interface UseOverlayDragReturn<TState> {
  /** Current state */
  state: TState;
  /** Whether a drag is in progress */
  isDragging: boolean;
  /** Current drag type */
  dragType: DragType;
  /** Start a drag operation */
  startDrag: (e: React.MouseEvent, type: DragType) => void;
  /** Reset state to initial */
  resetState: () => void;
  /** Manually set state */
  setState: React.Dispatch<React.SetStateAction<TState>>;
}

/**
 * Generic hook for overlay drag/resize operations
 * Used by CropOverlay and ShapeOverlay
 */
export function useOverlayDrag<TState>({
  initialState,
  onDragMove,
  getMousePosition,
  containerRef,
}: UseOverlayDragOptions<TState>): UseOverlayDragReturn<TState> {
  const [state, setState] = useState<TState>(initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<DragType>(null);

  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const stateStartRef = useRef<TState>(initialState);

  const startDrag = useCallback(
    (e: React.MouseEvent, type: DragType) => {
      e.preventDefault();
      e.stopPropagation();

      const container = containerRef.current;
      if (!container) return;

      const pos = getMousePosition(e.nativeEvent, containerRef);

      dragStartRef.current = pos;
      stateStartRef.current = state;
      setIsDragging(true);
      setDragType(type);
    },
    [containerRef, getMousePosition, state]
  );

  const resetState = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  // Handle mouse move and mouse up on document
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const current = getMousePosition(e, containerRef);
      const delta: Point = {
        x: current.x - dragStartRef.current.x,
        y: current.y - dragStartRef.current.y,
      };

      const newState = onDragMove(dragType, delta, stateStartRef.current);
      setState(newState);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragType(null);
    };

    const cleanup = addListeners(document, {
      mouseup: handleMouseUp,
      mousemove: handleMouseMove,
    });
    return cleanup;
  }, [isDragging, dragType, containerRef, getMousePosition, onDragMove]);

  return {
    state,
    isDragging,
    dragType,
    startDrag,
    resetState,
    setState,
  };
}
