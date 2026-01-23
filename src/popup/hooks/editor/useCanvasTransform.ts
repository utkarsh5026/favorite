import { setupCanvas, downloadImage } from '@/utils';
import { useCallback } from 'react';

/**
 * Type for the function that computes the size of the canvas based on the image.
 */
export type ComputeSize = (img: HTMLImageElement) => { width: number; height: number };

/**
 * Type for the function that applies transformations to the canvas context.
 */
export type ApplyTransform = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => void;

/**
 * Hook for executing canvas-based image transformations.
 *
 * Returns a function that accepts the image URL and transformation callbacks,
 * allowing dynamic transformations to be applied at call time.
 */
export function useCanvasTransform() {
  const executeTransform = useCallback(
    async (
      imageUrl: string,
      computeSize: ComputeSize,
      applyTransform: ApplyTransform
    ): Promise<string> => {
      const img = await downloadImage(imageUrl);
      const size = computeSize(img);
      const canvas = setupCanvas(size.width, size.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      applyTransform(ctx, img);
      return canvas.toDataURL('image/png');
    },
    []
  );

  return { executeTransform };
}
