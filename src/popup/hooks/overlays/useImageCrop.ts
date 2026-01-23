import { useState, useCallback, useRef, useEffect } from 'react';
import type { CropData, DragType, HandlePosition, Point } from '@/popup/editor/crop/types';
import { useCanvasContext } from '@/popup/canvas';
import { addListeners } from '@/utils';

interface UseCropOptions {
  minCropSize: number;
}

export function useCrop({ minCropSize }: UseCropOptions) {
  const { displayScale, imageWidth, imageHeight, canvasRef } = useCanvasContext();

  const [crop, setCrop] = useState<CropData>(() => {
    const margin = 0.1;
    const w = imageWidth > 0 ? imageWidth : 200;
    const h = imageHeight > 0 ? imageHeight : 200;
    return {
      x: w * margin,
      y: h * margin,
      width: w * (1 - 2 * margin),
      height: h * (1 - 2 * margin),
    };
  });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragTypeRef = useRef<DragType>(null);
  const cropStartRef = useRef<CropData>(crop);

  const minCropSizeRef = useRef(minCropSize);
  useEffect(() => {
    minCropSizeRef.current = minCropSize;
  });

  const getMousePos = useCallback((e: MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, [canvasRef]);

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

  const startDrag = useCallback(
    (e: React.MouseEvent, type: DragType) => {
      e.preventDefault();
      e.stopPropagation();

      const pos = getMousePos(e.nativeEvent);
      dragStartRef.current = pos;
      dragTypeRef.current = type;
      setCrop((current) => {
        cropStartRef.current = current;
        return current;
      });
      setIsDragging(true);
    },
    [getMousePos]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const current = getMousePos(e);
      const delta: Point = {
        x: current.x - dragStartRef.current.x,
        y: current.y - dragStartRef.current.y,
      };
      const newCrop = computeDragResult(dragTypeRef.current, delta, cropStartRef.current);
      setCrop(newCrop);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragTypeRef.current = null;
    };

    const cleanup = addListeners(document, {
      mouseup: handleMouseUp,
      mousemove: handleMouseMove,
    });
    return cleanup;
  }, [isDragging, computeDragResult, getMousePos]);

  return { crop, isDragging, startDrag, displayScale };
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
