import { setupCanvas, downloadImage } from '../utils';
import type { FaviconShape } from '../types';
import { clipImageToShape } from './shape';

const SUPPORTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const OUTPUT_SIZE = 256; // Max output size for storage

export interface UploadResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
  dimensions?: { width: number; height: number };
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an uploaded file against supported types and size limits
 */
function validateFile(file: File): ValidationResult {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Unsupported format. Use: PNG, JPG, GIF, SVG, WebP, ICO' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Max size: 5MB' };
  }
  return { valid: true };
}

/**
 * Reads a file and converts it to a data URL string
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes and centers an image on a canvas, returning it as a data URL
 */
function resizeAndCenterImage(img: HTMLImageElement): string {
  const maxDim = Math.max(img.naturalWidth, img.naturalHeight);
  const size = Math.min(OUTPUT_SIZE, maxDim);

  const canvas = setupCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const x = (size - img.naturalWidth * scale) / 2;
  const y = (size - img.naturalHeight * scale) / 2;

  ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);

  return canvas.toDataURL('image/png');
}

/**
 * Processes an uploaded file through validation, loading, and resizing
 * Returns a result object with success status and processed image data
 */
export async function processFile(file: File): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const img = await downloadImage(dataUrl);
    const processedUrl = resizeAndCenterImage(img);

    return {
      success: true,
      dataUrl: processedUrl,
      dimensions: { width: img.naturalWidth, height: img.naturalHeight },
    };
  } catch (error) {
    return { success: false, error: 'Failed to process image' };
  }
}

/**
 * Applies a shape mask to an image and returns the masked result
 * Falls back to original image if masking fails
 */
export async function applyShapeAndPreview(dataUrl: string, shape: FaviconShape): Promise<string> {
  const img = await downloadImage(dataUrl);

  return new Promise((resolve) => {
    clipImageToShape(
      64, // Preview size
      shape,
      img,
      () => resolve(dataUrl), // Fallback on fail
      (maskedUrl) => resolve(maskedUrl)
    );
  });
}
