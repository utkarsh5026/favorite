/**
 * CropTransform - Canvas transformation for cropping images
 */

import type { CanvasTransform } from '../transforms/types';
import type { CropData } from './types';

/**
 * Transform that crops an image to the specified region
 */
export class CropTransform implements CanvasTransform {
  constructor(private readonly cropData: CropData) {}

  computeSize(_img: HTMLImageElement): { width: number; height: number } {
    return {
      width: Math.round(this.cropData.width),
      height: Math.round(this.cropData.height),
    };
  }

  apply(ctx: CanvasRenderingContext2D, img: HTMLImageElement): void {
    const { x, y, width, height } = this.round(this.cropData);
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  }

  private round(cropData: CropData): CropData {
    const { x, y, width, height } = cropData;
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
  }
}
