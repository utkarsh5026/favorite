import { useCallback } from 'react';
import { useCanvasTransform } from '../editor/useCanvasTransform';
import type { CropData } from './types';

export function useCrop() {
  const { executeTransform } = useCanvasTransform();

  return useCallback(
    (imageUrl: string, cropData: CropData) => {
      const round = (data: CropData) => ({
        x: Math.round(data.x),
        y: Math.round(data.y),
        width: Math.round(data.width),
        height: Math.round(data.height),
      });

      const computeSize = () => round(cropData);

      const applyTransform = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
        const { x, y, width, height } = round(cropData);
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      };

      return executeTransform(imageUrl, computeSize, applyTransform);
    },
    [executeTransform]
  );
}
