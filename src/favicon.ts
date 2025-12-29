import { CONFIG, state } from './state';
import type { CustomFavicons } from './types';
import JSZip from 'jszip';
import { resizeImage } from './image';
import { byID, downloadZip, all, setupCanvas } from './utils';
import { maskWithShape } from './shape';

const CUSTOM_FAVICONS_KEY = 'customFavicons';
const CUSTOM_FAVICON_SECTION_ID = 'customFaviconSection';
const FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const;
const DEFAULT_FAVICON_SIZE = 32;

/**
 * Changes the page favicon to the specified URL with optional shape masking
 * Shows a loading indicator while the image is being fetched and processed
 */
export function changeFavicon(imageUrl: string, applyMask: boolean = true): void {
  state.currentLoadingId++;
  const loadingId = state.currentLoadingId;
  const l = Loader.getInstance();

  if (applyMask) {
    l.startLoadingAnimation();
  } else {
    l.stopLoadingAnimation();
  }

  if (applyMask) {
    applyShapeMaskAndSetFavicon(imageUrl, loadingId);
  } else {
    setFaviconDirectly(imageUrl);
  }
}

/**
 * Determines the MIME type of image based on its URL
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
  const existingIcons = all<HTMLLinkElement>('link[rel*="icon"]');
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
const applyShapeMaskAndSetFavicon = (imageUrl: string, loadingId: number) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    // Only proceed if this is still the latest request
    if (state.currentLoadingId !== loadingId) return;

    try {
      maskWithShape(
        CONFIG.faviconSize,
        CONFIG.faviconShape,
        img,
        () => {
          // Check again before setting, as masking is async
          if (state.currentLoadingId === loadingId) {
            Loader.getInstance().stopLoadingAnimation();
            setFaviconDirectly(imageUrl);
          }
        },
        (dataUrl: string) => {
          // Check again before setting, as masking is async
          if (state.currentLoadingId === loadingId) {
            Loader.getInstance().stopLoadingAnimation();
            setFaviconDirectly(dataUrl);
          }
        }
      );
    } catch (error) {
      console.warn('Image Favicon Preview: Failed to apply shape mask, using original', error);
      if (state.currentLoadingId === loadingId) {
        Loader.getInstance().stopLoadingAnimation();
        setFaviconDirectly(imageUrl);
      }
    }
  };

  img.onerror = () => {
    // Only set if this is still the latest request
    if (state.currentLoadingId === loadingId) {
      Loader.getInstance().stopLoadingAnimation();
      setFaviconDirectly(imageUrl);
    }
  };

  img.src = imageUrl;
};

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

/**
 * Generates and downloads a ZIP file containing the favicon in multiple sizes
 * @param img - The HTML image element containing the favicon
 * @param faviconURL - The URL of the original favicon
 * @param hostname - The hostname to use for the ZIP filename
 */
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
  downloadZip(content, hostname);
}

class Loader {
  private static instance: Loader;
  private loadingAnimationId: number | null = null;

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {}

  /**
   * Gets the singleton instance of Loader
   */
  static getInstance(): Loader {
    if (!Loader.instance) {
      Loader.instance = new Loader();
    }
    return Loader.instance;
  }

  /**
   * Draws a loading spinner frame on canvas
   */
  drawLoadingSpinner(canvas: HTMLCanvasElement, rotation: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(center, center, center - 1, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f0f0';
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(rotation);
    ctx.translate(-center, -center);

    ctx.beginPath();
    ctx.arc(center, center, center * 0.6, 0, Math.PI * 1.5);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Creates and starts an animated loading spinner in the favicon
   */
  startLoadingAnimation(): void {
    this.stopLoadingAnimation();
    const canvas = setupCanvas(DEFAULT_FAVICON_SIZE, DEFAULT_FAVICON_SIZE);

    let rotation = 0;
    const animate = () => {
      this.drawLoadingSpinner(canvas, rotation);
      rotation += 0.1;

      const dataUrl = canvas.toDataURL('image/png');
      setFaviconDirectly(dataUrl);

      this.loadingAnimationId = window.requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Stops the loading animation
   */
  stopLoadingAnimation() {
    if (this.loadingAnimationId !== null) {
      window.cancelAnimationFrame(this.loadingAnimationId);
      this.loadingAnimationId = null;
    }
  }
}

export class CustomFaviconManager {
  /**
   * Gets the custom favicon for a specific hostname
   * @param hostname - The hostname to retrieve the custom favicon for
   * @returns The custom favicon object or null if not found
   */
  static async getCustomFavicon(hostname: string) {
    const customFavicons = await CustomFaviconManager.getCustomFavicons();
    return customFavicons[hostname] || null;
  }

  /**
   * Sets a custom favicon for a specific hostname
   * @param hostname - The hostname to set the custom favicon for
   * @param faviconURL - The URL of the custom favicon
   * @param onSuccess - Callback function to execute on successful save
   */
  static async setCustomFavicon(hostname: string, faviconURL: string, onSuccess: () => void) {
    const customFavicon = {
      url: faviconURL,
      timestamp: Date.now(),
    };

    const customFavicons = await CustomFaviconManager.getCustomFavicons();
    customFavicons[hostname] = customFavicon;

    await chrome.storage.local.set({ customFavicons });

    onSuccess();
    await CustomFaviconManager.loadCustomFaviconSection(hostname);
  }

  /**
   * Retrieves all custom favicons from chrome storage
   * @returns Object containing all custom favicons keyed by hostname
   */
  static async getCustomFavicons() {
    const result = await chrome.storage.local.get(CUSTOM_FAVICONS_KEY);
    return (result.customFavicons || {}) as CustomFavicons;
  }

  /**
   * Loads and displays the custom favicon section in the UI
   * @param hostname - The hostname to load the custom favicon section for
   */
  static async loadCustomFaviconSection(hostname: string): Promise<void> {
    const customSection = byID(CUSTOM_FAVICON_SECTION_ID);
    const customImage = byID<HTMLImageElement>('customFaviconImage');
    const customHint = byID('customFaviconHint');

    if (!customSection || !customImage) return;

    const customFavicon = await CustomFaviconManager.getCustomFavicon(hostname);
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

  /**
   * Removes a custom favicon for a specific hostname
   * @param hostname - The hostname to remove the custom favicon for
   * @param onRemove - Callback function to execute after removal
   */
  static async removeCustomFavicon(hostname: string, onRemove: () => void): Promise<void> {
    const customFavicons = await CustomFaviconManager.getCustomFavicons();
    delete customFavicons[hostname];

    await chrome.storage.local.set({ customFavicons });
    onRemove();

    const customSection = byID(CUSTOM_FAVICON_SECTION_ID);
    if (customSection) {
      customSection.classList.remove('visible');
    }
  }

  /**
   * Restores favicon to custom or original
   */
  static restoreToDefaultFavicon(customFaviconUrl: string | null): void {
    if (customFaviconUrl) {
      changeFavicon(customFaviconUrl);
    } else {
      restoreOriginalFavicon();
    }
  }
}
