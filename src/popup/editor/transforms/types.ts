/**
 * Interface that all canvas transformations must implement
 * This ensures consistency across different transform operations
 */
export interface CanvasTransform {
  /**
   * Calculate the required canvas dimensions for this transform
   * @param img - The source image
   * @returns The width and height needed for the output canvas
   */
  computeSize(img: HTMLImageElement): { width: number; height: number };

  /**
   * Apply the transformation to the canvas context
   * Should call ctx.drawImage() as part of the implementation
   * @param ctx - The canvas rendering context to draw on
   * @param img - The source image to transform
   */
  apply(ctx: CanvasRenderingContext2D, img: HTMLImageElement): void;
}

/**
 * Rotation degrees for image rotation
 */
export type RotationDegrees = 90 | 180 | 270;

/**
 * Flip direction for image flipping
 */
export type FlipDirection = 'horizontal' | 'vertical';
