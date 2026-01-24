import { useUIStore } from '@/popup/stores';
import type { FaviconShape } from '@/types';
import { useShapeInfo } from './useShapeInfo';
import { useCurrentImageUrl } from '../image';
import { useCallback } from 'react';

export function useShapeManipulation() {
  const currentImageUrl = useCurrentImageUrl();
  const enterShapeEditMode = useUIStore((s) => s.enterShapeEditMode);
  const { setShape, setShapeManipulation } = useShapeInfo();

  const handleShapeClick = useCallback(
    (shape: FaviconShape) => {
      if (shape === 'square') {
        setShape(shape);
        setShapeManipulation(null);
      } else if (currentImageUrl) {
        enterShapeEditMode(shape);
      } else {
        // No image loaded, just set the shape for when image is loaded
        setShape(shape);
      }
    },
    [setShape, setShapeManipulation, enterShapeEditMode, currentImageUrl]
  );

  return {
    handleShapeClick,
  };
}
