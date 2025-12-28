import { CONFIG, state } from './state';
import type { FaviconShape } from './types';

/**
 * Changes the page favicon to the specified URL with optional shape masking
 */
export function changeFavicon(imageUrl: string, applyMask: boolean = true): void {
  if (applyMask && CONFIG.faviconShape !== 'square') {
    applyShapeMaskAndSetFavicon(imageUrl);
  } else {
    setFaviconDirectly(imageUrl);
  }
}

/**
 * Sets the favicon directly without any processing
 */
function setFaviconDirectly(imageUrl: string): void {
  const existingIcons = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');
  existingIcons.forEach((icon: HTMLLinkElement) => icon.remove());

  const newFavicon = document.createElement('link');
  newFavicon.rel = 'icon';

  if (imageUrl.startsWith('data:image/svg')) {
    newFavicon.type = 'image/svg+xml';
  } else if (imageUrl.startsWith('data:image/png') || imageUrl.endsWith('.png')) {
    newFavicon.type = 'image/png';
  } else if (imageUrl.endsWith('.ico')) {
    newFavicon.type = 'image/x-icon';
  } else if (imageUrl.endsWith('.gif')) {
    newFavicon.type = 'image/gif';
  } else if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) {
    newFavicon.type = 'image/jpeg';
  } else if (imageUrl.endsWith('.webp')) {
    newFavicon.type = 'image/webp';
  } else {
    newFavicon.type = 'image/png';
  }

  newFavicon.href = imageUrl;
  document.head.appendChild(newFavicon);
}

/**
 * Applies a shape mask to the image and sets it as favicon
 */
function applyShapeMaskAndSetFavicon(imageUrl: string): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const size = CONFIG.faviconSize;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setFaviconDirectly(imageUrl);
        return;
      }

      // Apply shape mask
      ctx.beginPath();
      applyShapePath(ctx, size, CONFIG.faviconShape);
      ctx.closePath();
      ctx.clip();

      // Draw the image scaled to fit
      ctx.drawImage(img, 0, 0, size, size);

      const maskedDataUrl = canvas.toDataURL('image/png');
      setFaviconDirectly(maskedDataUrl);
    } catch (error) {
      console.warn('Image Favicon Preview: Failed to apply shape mask, using original', error);
      setFaviconDirectly(imageUrl);
    }
  };

  img.onerror = () => {
    setFaviconDirectly(imageUrl);
  };

  img.src = imageUrl;
}

/**
 * Applies the appropriate shape path to the canvas context
 */
function applyShapePath(ctx: CanvasRenderingContext2D, size: number, shape: FaviconShape): void {
  const center = size / 2;
  const radius = size / 2;

  switch (shape) {
    case 'circle':
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      break;
    case 'rounded':
      const cornerRadius = size * 0.2;
      ctx.moveTo(cornerRadius, 0);
      ctx.lineTo(size - cornerRadius, 0);
      ctx.quadraticCurveTo(size, 0, size, cornerRadius);
      ctx.lineTo(size, size - cornerRadius);
      ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
      ctx.lineTo(cornerRadius, size);
      ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
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
 * Saves the original favicon URL for later restoration
 */
export function saveOriginalFavicon(): void {
  if (state.originalFavicon !== null) return;

  const existingFavicon = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
  if (existingFavicon?.href) {
    state.originalFavicon = existingFavicon.href;
    console.log('Image Favicon Preview: Original favicon saved');
  } else {
    state.originalFavicon = '/favicon.ico';
    console.log('Image Favicon Preview: Using default favicon path');
  }
}

/**
 * Restores the original favicon
 */
export function restoreOriginalFavicon(): void {
  if (state.originalFavicon) {
    changeFavicon(state.originalFavicon, false);
  }
}
