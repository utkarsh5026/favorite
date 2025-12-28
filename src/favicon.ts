import { CONFIG, state } from './state';
import type { FaviconShape, CustomFavicon, CustomFavicons } from './types';
import JSZip from 'jszip';
import { resizeImage } from './image';

const CUSTOM_FAVICONS_KEY = 'customFavicons';
const CUSTOM_FAVICON_SECTION_ID = 'customFaviconSection';
const FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const;

/**
 * Changes the page favicon to the specified URL with optional shape masking
 */
export function changeFavicon(imageUrl: string, applyMask: boolean = true): void {
  if (applyMask && CONFIG.faviconShape !== 'square') {
    applyShapeMaskAndSetFavicon(imageUrl);
    return;
  }
  setFaviconDirectly(imageUrl);
}

/**
 * Determines the MIME type of an image based on its URL
 */
function getImageMimeType(imageUrl: string): string {
  if (imageUrl.startsWith('data:image/svg')) {
    return 'image/svg+xml';
  }

  if (imageUrl.startsWith('data:image/png') || imageUrl.endsWith('.png')) {
    return 'image/png';
  }

  if (imageUrl.endsWith('.ico')) {
    return 'image/x-icon';
  }

  if (imageUrl.endsWith('.gif')) {
    return 'image/gif';
  }

  if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (imageUrl.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/png';
}

/**
 * Sets the favicon directly without any processing
 */
const setFaviconDirectly = (imageUrl: string) => {
  const existingIcons = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');
  existingIcons.forEach((icon: HTMLLinkElement) => icon.remove());

  const fav = document.createElement('link');
  fav.rel = 'icon';
  fav.type = getImageMimeType(imageUrl);
  fav.href = imageUrl;
  document.head.appendChild(fav);
};

/**
 * Applies a shape mask to the image and sets it as favicon
 */
const applyShapeMaskAndSetFavicon = (imageUrl: string) => {
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

      ctx.beginPath();
      applyShapePath(ctx, size, CONFIG.faviconShape);
      ctx.closePath();
      ctx.clip();

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
};

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

async function getCustomFavicon(hostname: string) {
  const customFavicons = await getCustomFavicons();
  return customFavicons[hostname] || null;
}

export async function setCustomFavicon(
  hostname: string,
  faviconURL: string,
  onSuccess: () => void
) {
  if (!hostname || !faviconURL) return;

  const customFavicon: CustomFavicon = {
    url: faviconURL,
    timestamp: Date.now(),
  };

  const customFavicons = await getCustomFavicons();
  customFavicons[hostname] = customFavicon;

  await chrome.storage.local.set({ customFavicons });

  onSuccess();
  await loadCustomFaviconSection(hostname);
}

async function getCustomFavicons() {
  const result = await chrome.storage.local.get(CUSTOM_FAVICONS_KEY);
  return (result.customFavicons || {}) as CustomFavicons;
}

export async function loadCustomFaviconSection(hostname: string): Promise<void> {
  const customSection = document.getElementById(CUSTOM_FAVICON_SECTION_ID);
  const customImage = document.getElementById('customFaviconImage') as HTMLImageElement;
  const customHint = document.getElementById('customFaviconHint');

  if (!customSection || !customImage) return;

  const customFavicon = await getCustomFavicon(hostname);
  if (!customFavicon) {
    customSection.classList.remove('visible');
    return;
  }

  customImage.src = customFavicon.url;
  customSection.classList.add('visible');

  if (customHint) {
    const date = new Date(customFavicon.timestamp);
    customHint.textContent = `Set ${date.toLocaleDateString()}`;
  }
}

export async function removeCustomFavicon(hostname: string, onRemove: () => void): Promise<void> {
  const customFavicons = await getCustomFavicons();
  delete customFavicons[hostname];

  await chrome.storage.local.set({ customFavicons });

  onRemove();

  const customSection = document.getElementById(CUSTOM_FAVICON_SECTION_ID);
  if (customSection) {
    customSection.classList.remove('visible');
  }
}

export async function saveFaviconZIP(
  img: HTMLImageElement,
  faviconURL: string,
  hostname: string
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('favicons');

  if (!folder) {
    throw new Error('Failed to create folder in ZIP');
  }

  for (const size of FAVICON_SIZES) {
    try {
      const blob = await resizeImage(img, size);
      const name = `favicon-${size}x${size}.png`;
      folder.file(name, blob);
    } catch (error) {
      console.warn(`Failed to generate ${size}x${size}:`, error);
    }
  }

  const original = await fetch(faviconURL);
  const originalBlob = await original.blob();
  const extension = faviconURL.endsWith('.ico') ? 'ico' : 'png';
  folder.file(`favicon-original.${extension}`, originalBlob);

  const content = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `favicons-${hostname}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
