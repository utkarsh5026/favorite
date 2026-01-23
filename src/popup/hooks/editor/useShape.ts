import { useCallback } from 'react';
import { useCanvasTransform } from './useCanvasTransform';
import { createCenteredShapeClipPath } from '@/images/shape';
import type { FaviconShape } from '@/types';
import {
  type ShapeManipulationData,
  DEFAULT_SHAPE_MANIPULATION,
} from '@/popup/editor/shapes/types';

export function useShape() {
  const { executeTransform } = useCanvasTransform();

  return useCallback(
    (imageUrl: string, shape: FaviconShape, manipulation?: ShapeManipulationData | null) => {
      const computeSize = (img: HTMLImageElement) => {
        const size = Math.max(img.naturalWidth, img.naturalHeight);
        return { width: size, height: size };
      };

      const applyTransform = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
        const canvas = ctx.canvas;
        const data = manipulation
          ? {
              centerX: manipulation.centerX,
              centerY: manipulation.centerY,
              scale: manipulation.scale,
            }
          : DEFAULT_SHAPE_MANIPULATION;

        const baseSize = Math.min(canvas.width, canvas.height);
        const shapeSize = baseSize * data.scale;
        const shapeCenterX = canvas.width * data.centerX;
        const shapeCenterY = canvas.height * data.centerY;

        ctx.beginPath();
        createCenteredShapeClipPath(ctx, shapeCenterX, shapeCenterY, shapeSize, shape);
        ctx.closePath();
        ctx.clip();

        const offsetX = (canvas.width - img.naturalWidth) / 2;
        const offsetY = (canvas.height - img.naturalHeight) / 2;
        ctx.drawImage(img, offsetX, offsetY);
      };

      return executeTransform(imageUrl, computeSize, applyTransform);
    },
    [executeTransform]
  );
}
