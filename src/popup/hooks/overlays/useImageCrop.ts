import { useCallback, useRef, useEffect, useMemo } from 'react';
import type { CropData, DragType, HandlePosition, Point } from '@/popup/editor/crop/types';
import { useCanvasContext } from '@/popup/canvas';
import { useOverlayDrag } from './useOverlayDrag';

interface UseCropOptions {
  minCropSize: number;
}

export function useCrop({ minCropSize }: UseCropOptions) {
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

  const getMousePos = useCallback((e: MouseEvent, containerRef: React.RefObject<HTMLCanvasElement | null>): Point => {
    const canvas = containerRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const computeDragResult = useCallback(
    (dragType: DragType, delta: Point, startState: CropData): CropData => {
      const min = minCropSizeRef.current;

      const dx = delta.x / displayScale;
      const dy = delta.y / displayScale;

      if (dragType === 'move') {
        const { x, y } = startState;
        return constrainCrop({ ...startState, x: x + dx, y: y + dy }, imageHeight, imageWidth, min);
      }

      const type = dragType || '' as HandlePosition;
      const updates = resizeCrop(
        type,
        startState,
        dx,
        dy,
        imageHeight,
        imageWidth,
        min
      );
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
