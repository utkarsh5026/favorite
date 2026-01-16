import { setupCanvas } from '@/utils';

const IMAGE_MIME_TYPE = 'image/png';

/**
 * Converts an image URL to a data URL using canvas
 * @param imageUrl - The URL of the image to convert
 * @param beforeDraw - Optional callback to run before drawing the image (e.g., for clipping)
 * @param size - Optional size for the canvas (defaults to image natural size)
 */
export async function convertToDataUrl(
  imageUrl: string,
  beforeDraw?: (ctx: CanvasRenderingContext2D, size: number) => void,
  size?: number
): Promise<{
  url: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvasSize =
          size || Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
        const canvas = setupCanvas(canvasSize, canvasSize);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ url: '', error: 'Failed to get canvas context' });
          return;
        }

        beforeDraw?.(ctx, canvasSize);
        ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
        const dataUrl = canvas.toDataURL(IMAGE_MIME_TYPE);
        resolve({ url: dataUrl });
      } catch (error) {
        resolve({ url: '', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    img.onerror = () => {
      resolve({ url: '', error: 'Failed to load image' });
    };

    img.src = imageUrl;
  });
}

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
  return await canvasToBlob(draw(img, size));
}

export function getImageAsDataUrl(img: HTMLImageElement, size: number) {
  return draw(img, size).toDataURL(IMAGE_MIME_TYPE);
}

function draw(img: HTMLImageElement, size: number) {
  const canvas = setupCanvas(size, size);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, size, size);
  return canvas;
}
