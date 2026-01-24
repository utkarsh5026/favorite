import type { FaviconShape } from '../types';
import { byID, setupCanvas } from '../utils';
import { convertToDataUrl } from './canvas';
import { getClipper, getCenteredClipper } from './clip';

const IMAGE_MIME_TYPE = 'image/png';

/**
 * Applies the appropriate shape path to the canvas context
 * @param ctx - The canvas rendering context to draw the path on
 * @param size - The size of the shape in pixels
 * @param shape - The type of shape to apply (circle, rounded, or square)
 */
export function createShapeClipPath(
  ctx: CanvasRenderingContext2D,
  size: number,
  shape: FaviconShape
): void {
  return getClipper(shape)(ctx, size);
}

/**
 * Creates a shape clip path centered at the specified position.
 * Used for shape manipulation with custom position and scale.
 * @param ctx - The canvas rendering context
 * @param centerX - Center X position in canvas coordinates
 * @param centerY - Center Y position in canvas coordinates
 * @param size - Size of the shape in pixels
 * @param shape - The shape type
 */
export function createCenteredShapeClipPath(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  shape: FaviconShape
): void {
  return getCenteredClipper(shape)(ctx, centerX, centerY, size);
}

/**
 * Applies a shape to the current favicon preview image
 * @param shape - The shape to apply to the favicon (circle, rounded, or square)
 * @param faviconURL - The URL of the favicon image to apply the shape to
 */
export async function applyShapeToPreview(shape: FaviconShape, faviconURL: string): Promise<void> {
  if (!faviconURL) return;

  const faviconImage = byID('faviconImage') as HTMLImageElement;
  if (!faviconImage) return;

  if (shape === 'square') {
    faviconImage.src = faviconURL;
    return;
  }

  const result = await convertToDataUrl(
    faviconURL,
    (ctx, size) => {
      ctx.beginPath();
      createShapeClipPath(ctx, size, shape);
      ctx.closePath();
      ctx.clip();
    },
    256
  );

  faviconImage.src = result.url || faviconURL;
}

/**
 * Masks an image with a specified shape by clipping it on a canvas
 * @param canvasSize - The size of the canvas in pixels
 * @param shape - The shape to use for masking (circle, rounded, or square)
 * @param img - The image element to mask
 * @param onFail - Callback function to execute if masking fails
 * @param onSuccess - Callback function to execute with the masked image data URL on success
 */
export function clipImageToShape(
  canvasSize: number,
  shape: FaviconShape,
  img: HTMLImageElement,
  onFail: () => void,
  onSuccess: (dataUrl: string) => void
): void {
  const canvas = setupCanvas(canvasSize, canvasSize);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    onFail();
    return;
  }

  ctx.beginPath();
  createShapeClipPath(ctx, canvasSize, shape);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
  onSuccess(canvas.toDataURL(IMAGE_MIME_TYPE));
}
