import type { FaviconShape } from '../types';
import { downloadImage, byID } from '../utils';

const IMAGE_MIME_TYPE = 'image/png';

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, IMAGE_MIME_TYPE);
  });
}

export async function resizeImageToBlob(img: HTMLImageElement, size: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, size, size);

  return await canvasToBlob(canvas);
}

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
  const center = size / 2;
  const radius = size / 2;

  switch (shape) {
    case 'circle':
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      break;
    case 'rounded':
      const cornerRadius = size * 0.2;
      const lineLength = size - cornerRadius;

      ctx.moveTo(cornerRadius, 0);

      ctx.lineTo(lineLength, 0);
      ctx.quadraticCurveTo(size, 0, size, cornerRadius);

      ctx.lineTo(size, lineLength);
      ctx.quadraticCurveTo(size, size, lineLength, size);

      ctx.lineTo(cornerRadius, size);
      ctx.quadraticCurveTo(0, size, 0, lineLength);

      ctx.lineTo(0, cornerRadius);
      ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
      break;
    case 'square':
    default:
      ctx.rect(0, 0, size, size);
      break;
  }
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

  const img = await downloadImage(faviconURL);
  const size = Math.max(img.naturalWidth, img.naturalHeight, 256);
  clipImageToShape(
    size,
    shape,
    img,
    () => {
      faviconImage.src = faviconURL;
    },
    (dataUrl: string) => {
      faviconImage.src = dataUrl;
    }
  );
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
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;

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
