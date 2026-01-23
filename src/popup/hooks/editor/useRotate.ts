import { useCanvasTransform } from './useCanvasTransform';
import type { RotationDegrees } from './types';
import { useCallback } from 'react';

export function useRotate() {
  const { executeTransform } = useCanvasTransform();

  return useCallback(
    (imageUrl: string, degrees: RotationDegrees) => {
      const computeSize = (img: HTMLImageElement) => {
        const { naturalHeight: h, naturalWidth: w } = img;
        return degrees === 90 || degrees === 270
          ? { width: h, height: w }
          : { width: w, height: h };
      };

      const applyTransform = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
        const canvas = ctx.canvas;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      };

      return executeTransform(imageUrl, computeSize, applyTransform);
    },
    [executeTransform]
  );
}
