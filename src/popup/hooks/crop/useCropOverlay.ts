import { useMemo } from 'react';
import type { CropData } from './types';
import type { BoundingBoxConfig } from '../editor/boundingBox/types';
import { useCanvasContext } from '@/popup/canvas';
import { useBoundingBox } from '../editor/boundingBox/useBoundingBox';

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
 * @returns Crop overlay state and drag handlers
 */
export function useCropOverlay({ minCropSize }: UseCropOptions) {
  const { imageWidth, imageHeight } = useCanvasContext();

  const initialBox = useMemo(() => {
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

  const config = useMemo<BoundingBoxConfig>(() => ({
    minSize: minCropSize,
    aspectRatio: null,
  }), [minCropSize]);

  const {
    box,
    isDragging,
    dragType,
    startDrag,
    reset,
    setBox,
  } = useBoundingBox({
    initialBox,
    config,
  });

  return {
    state: box as CropData,
    isDragging,
    dragType,
    startDrag,
    resetState: reset,
    setState: setBox,
  };
}
