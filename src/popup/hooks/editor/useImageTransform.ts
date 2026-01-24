import { useCurrentImageUrl } from '../image';
import { useEditorStore, useUIStore } from '@/popup/stores';
import { useCallback, useState } from 'react';
import type { RotationDegrees, FlipDirection } from './types';
import type { RectangleWithPosition } from '@/types';
import { useRotate } from './useRotate';
import { useFlip } from './useFlip';
import { useCrop } from '../crop/useCrop';

/**
 * Hook for image transformation operations (rotate, flip, crop)
 *
 * Provides methods to perform non-destructive image transformations with
 * automatic history tracking, loading states, and error handling. All
 * transformations are added to the undo/redo history.
 */
export function useImageTransform() {
  const currentImageUrl = useCurrentImageUrl();
  const pushToHistory = useEditorStore((s) => s.pushToHistory);
  const showStatus = useUIStore((s) => s.showStatus);
  const [isTransforming, setIsTransforming] = useState(false);

  const rotateImage = useRotate();
  const flipImage = useFlip();
  const cropTransform = useCrop();

  /**
   * Generic transformation wrapper that handles loading states, error handling,
   * and history management for image transformations.
   */
  const transform = useCallback(
    async (transformFn: () => Promise<string>, failedMsg: string) => {
      setIsTransforming(true);
      try {
        const result = await transformFn();
        return pushToHistory(result);
      } catch {
        showStatus(failedMsg);
      } finally {
        setIsTransforming(false);
      }
    },
    [showStatus, pushToHistory]
  );

  const rotate = useCallback(
    async (degrees: RotationDegrees) => {
      if (!currentImageUrl) return;
      await transform(() => rotateImage(currentImageUrl, degrees), 'Failed to rotate image');
    },
    [transform, currentImageUrl, rotateImage]
  );

  const flip = useCallback(
    async (direction: FlipDirection) => {
      if (!currentImageUrl) return;
      await transform(() => flipImage(currentImageUrl, direction), 'Failed to flip image');
    },
    [transform, currentImageUrl, flipImage]
  );

  const cropImage = useCallback(
    async (cropData: RectangleWithPosition) => {
      if (!currentImageUrl) return;
      await transform(() => cropTransform(currentImageUrl, cropData), 'Failed to crop image');
    },
    [transform, currentImageUrl, cropTransform]
  );

  return {
    flip,
    rotate,
    isTransforming,
    cropImage,
  };
}
