/**
 * Live preview broadcasting to popup
 */
import { scriptState } from './state';
import type { LivePreviewMessage } from './types';
import type { FaviconShape } from '@/types';

// Throttle for hover broadcasts
const BROADCAST_THROTTLE = 100; // ms

// Preview size for processed images sent to popup
const PREVIEW_SIZE = 64;

/**
 * Creates a shape clip path on a canvas context
 */
function createShapeClipPath(
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
 * Processes an image element to a 64px data URL with shape masking applied
 * This runs in the content script where the image is already loaded
 */
async function processImageForPreview(
  imgElement: Element,
  shape: FaviconShape
): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return null;

    if (shape !== 'square') {
      ctx.beginPath();
      createShapeClipPath(ctx, PREVIEW_SIZE, shape);
      ctx.closePath();
      ctx.clip();
    }

    ctx.drawImage(imgElement as HTMLImageElement, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('[Content] Failed to process image for preview:', error);
    return null;
  }
}

/**
 * Broadcasts hover state to popup via background script
 * Now includes pre-processed image data for instant display
 */
export async function broadcastHoverState(
  imageUrl: string | null,
  imageInfo?: { width: number; height: number; imageType: string },
  imgElement?: Element,
  shape?: FaviconShape
): Promise<void> {
  const now = Date.now();
  if (imageUrl && now - scriptState.lastBroadcast < BROADCAST_THROTTLE) return;
  scriptState.updateLastBroadcast(now);

  let processedImageUrl: string | undefined;
  if (imgElement && shape) {
    processedImageUrl = (await processImageForPreview(imgElement, shape)) || undefined;
  }

  const message: LivePreviewMessage = {
    type: 'hover-update',
    imageUrl,
    processedImageUrl,
    imageInfo,
  };

  chrome.runtime.sendMessage(message).catch((error) => {
    console.log('[Content] Failed to broadcast:', error);
  });
}
