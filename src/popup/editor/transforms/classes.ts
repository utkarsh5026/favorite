import type { RotationDegrees, FlipDirection, CanvasTransform, FaviconShape } from './types';
import { createShapeClipPath } from '@/images/shape';

/**
 * Transform that rotates an image by specified degrees
 * Supports 90, 180, and 270 degree rotations
 */
export class RotateTransform implements CanvasTransform {
  constructor(private readonly degrees: RotationDegrees) {}

  computeSize(img: HTMLImageElement): { width: number; height: number } {
    return this.degrees === 90 || this.degrees === 270
      ? { width: img.naturalHeight, height: img.naturalWidth }
      : { width: img.naturalWidth, height: img.naturalHeight };
  }

  apply(ctx: CanvasRenderingContext2D, img: HTMLImageElement): void {
    const canvas = ctx.canvas;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((this.degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  }
}

/**
 * Transform that flips an image horizontally or vertically
 */
export class FlipTransform implements CanvasTransform {
  constructor(private readonly direction: FlipDirection) {}

  computeSize(img: HTMLImageElement): { width: number; height: number } {
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  }

  apply(ctx: CanvasRenderingContext2D, img: HTMLImageElement): void {
    if (this.direction === 'horizontal') {
      ctx.translate(img.naturalWidth, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, img.naturalHeight);
      ctx.scale(1, -1);
    }

    ctx.drawImage(img, 0, 0);
  }
}

/**
 * Transform that applies a shape mask to an image
 * Supports circle, rounded, and square shapes
 */
export class ShapeTransform implements CanvasTransform {
  constructor(private readonly shape: FaviconShape) {}

  computeSize(img: HTMLImageElement): { width: number; height: number } {
    const size = Math.max(img.naturalWidth, img.naturalHeight);
    return { width: size, height: size };
  }

  apply(ctx: CanvasRenderingContext2D, img: HTMLImageElement): void {
    const canvas = ctx.canvas;

    ctx.beginPath();
    createShapeClipPath(ctx, canvas.width, this.shape);
    ctx.closePath();
    ctx.clip();

    const offsetX = (canvas.width - img.naturalWidth) / 2;
    const offsetY = (canvas.height - img.naturalHeight) / 2;
    ctx.drawImage(img, offsetX, offsetY);
  }
}
