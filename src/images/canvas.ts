import { setupCanvas, loadImage } from '@/utils';

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
    loadImage(
      imageUrl,
      (img) => {
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
      },
      () => resolve({ url: '', error: 'Failed to load image' })
    );
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

export function getImageAsDataUrl(img: HTMLImageElement, size: number): string | null {
  if (!img.complete || !img.naturalWidth || img.naturalWidth === 0) {
    return null;
  }

  try {
    return draw(img, size).toDataURL(IMAGE_MIME_TYPE);
  } catch (error) {
    console.error('[Canvas] Failed to convert image to data URL:', error);
    return null;
  }
}

/**
 * Fetches an image URL and converts it to a data URL using fetch.
 * This works for cross-origin images in extensions with host_permissions.
 * @param imageUrl - The URL of the image to fetch
 * @param size - Size to resize the image to
 * @returns The data URL or null if failed
 */
export async function fetchImageAsDataUrl(imageUrl: string, size: number): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('[Canvas] Failed to fetch image:', response.status);
      return null;
    }

    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    const canvas = setupCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageBitmap, 0, 0, size, size);

    return canvas.toDataURL(IMAGE_MIME_TYPE);
  } catch (error) {
    console.error('[Canvas] Failed to fetch and convert image:', error);
    return null;
  }
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
