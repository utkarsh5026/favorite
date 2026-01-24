import { useRef, useMemo, useCallback } from 'react';
import type { FaviconShape } from '@/types';
import { useCanvasContext } from '@/popup/canvas';
import type { ShapeManipulationData } from '@/popup/editor/shapes/types';
import { useBoundingBox, type BoundingBox, type BoundingBoxConfig } from '../editor/boundingBox';

/** Internal state type (excludes shape from ShapeManipulationData) */
type ManipulationState = Omit<ShapeManipulationData, 'shape'>;

interface UseShapeOverlayOptions {
  /** Shape type being manipulated */
  shape: FaviconShape;
  /** Initial manipulation state (optional, defaults to centered at scale 0.5) */
  initialManipulation?: ShapeManipulationData | null;
}

/**
 * Hook for shape manipulation overlay.
 * Handles drag/resize operations for shape positioning and scaling.
 */
export function useShapeOverlay({ shape, initialManipulation }: UseShapeOverlayOptions) {
  const { imageWidth, imageHeight } = useCanvasContext();

  const selectionRef = useRef<HTMLDivElement>(null);

  /**
   * Convert ShapeManipulationData (normalized) to BoundingBox (pixels).
   * The shape is always square, sized relative to min(imageWidth, imageHeight).
   */
  const normalizedToBox = useCallback(
    (data: ShapeManipulationData | null) => {
      const minDim = Math.min(imageWidth, imageHeight);
      const centerX = data?.centerX ?? 0.5;
      const centerY = data?.centerY ?? 0.5;
      const scale = data?.scale ?? 0.5;

      const size = minDim * scale;
      return {
        x: centerX * imageWidth - size / 2,
        y: centerY * imageHeight - size / 2,
        width: size,
        height: size,
      };
    },
    [imageHeight, imageWidth]
  );

  /**
   * Convert BoundingBox (pixels) to ShapeManipulationData (normalized).
   * Assumes the box is square (enforced by aspectRatio: 1 in config).
   */
  const boxToNormalized = useCallback(
    (box: BoundingBox) => {
      const minDim = Math.min(imageWidth, imageHeight);
      const size = box.width;

      return {
        shape,
        centerX: (box.x + size / 2) / imageWidth,
        centerY: (box.y + size / 2) / imageHeight,
        scale: size / minDim,
      };
    },
    [imageHeight, imageWidth, shape]
  );

  const initialBox = useMemo(() => {
    const data =
      initialManipulation && initialManipulation.shape === shape ? initialManipulation : null;
    return normalizedToBox(data);
  }, [initialManipulation, shape, normalizedToBox]);

  const config = useMemo<BoundingBoxConfig>(
    () => ({
      minSize: Math.min(imageWidth, imageHeight) * 0.1,
      aspectRatio: 1, // Square for shapes
    }),
    [imageWidth, imageHeight]
  );

  const { box, displayBox, isDragging, startDrag } = useBoundingBox({
    initialBox,
    config,
  });

  const state = useMemo<ManipulationState>(() => {
    const normalized = boxToNormalized(box);
    return {
      centerX: normalized.centerX,
      centerY: normalized.centerY,
      scale: normalized.scale,
    };
  }, [box, boxToNormalized]);

  return {
    state,
    isDragging,
    startDrag,
    displayBox,
    selectionRef,
  };
}
