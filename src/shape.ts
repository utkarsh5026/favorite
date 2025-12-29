import type { FaviconShape } from './types';
import { byID, downloadImage } from './utils';

/**
 * Applies the appropriate shape path to the canvas context
 */
export function applyShapePath(
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
  maskWithShape(
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

export function maskWithShape(
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
  applyShapePath(ctx, canvasSize, shape);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
  onSuccess(canvas.toDataURL('image/png'));
}
