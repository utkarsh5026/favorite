import { useCanvasTransform } from './useCanvasTransform';
import type { FlipDirection } from './types';
import { useCallback } from 'react';

export function useFlip() {
  const { executeTransform } = useCanvasTransform();

  return useCallback(
    (imageUrl: string, direction: FlipDirection) => {
      const computeSize = (img: HTMLImageElement) => ({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });

      const applyTransform = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
        if (direction === 'horizontal') {
          ctx.translate(img.naturalWidth, 0);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(0, img.naturalHeight);
          ctx.scale(1, -1);
        }
        ctx.drawImage(img, 0, 0);
      };

      return executeTransform(imageUrl, computeSize, applyTransform);
    },
    [executeTransform]
  );
}
