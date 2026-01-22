import { useState, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { rotateImage, flipImage } from '@/popup/editor/transforms';

/**
 * Hook for image transformation operations (rotate, flip)
 * Provides loading states and error handling
 */
export function useImageTransform() {
  const currentImageUrl = useEditorStore((s) => s.currentImageUrl);
  const pushToHistory = useEditorStore((s) => s.pushToHistory);
  const showStatus = useUIStore((s) => s.showStatus);
  const [isTransforming, setIsTransforming] = useState(false);

  const transform = useCallback(async (transformFn: () => Promise<string>, failedMsg: string) => {
    setIsTransforming(true);
    try {
      const result = await transformFn();
      return pushToHistory(result);
    } catch {
      showStatus(failedMsg);
    } finally {
      setIsTransforming(false);
    }
  }, [showStatus, currentImageUrl, pushToHistory]);

  const rotate = useCallback(
    async (degrees: 90 | 180 | 270) => {
      if (!currentImageUrl) return;
      await transform(
        () => rotateImage(currentImageUrl, degrees),
        'Failed to rotate image'
      );
    },
    [currentImageUrl, pushToHistory, showStatus]
  );

  const flip = useCallback(
    async (direction: 'horizontal' | 'vertical') => {
      if (!currentImageUrl) return;
      await transform(
        () => flipImage(currentImageUrl, direction),
        'Failed to flip image'
      );
    },
    [currentImageUrl, pushToHistory, showStatus, transform]
  );

  return {
    flip,
    rotate,
    isTransforming,
  };
}
