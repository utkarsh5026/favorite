import { CONFIG, state } from '@/extension';
import { all, setupCanvas } from '@/utils';
import { clipImageToShape } from '@/images';

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
    applyShapeMaskAndSetFavicon(imageUrl, loadingId);
    return;
  }

  l.stopLoadingAnimation();
  setFaviconDirectly(imageUrl);
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
      clipImageToShape(
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

export function restoreToDefaultFavicon(customFaviconUrl: string | null): void {
  if (customFaviconUrl) {
    changeFavicon(customFaviconUrl);
  } else {
    restoreOriginalFavicon();
  }
}
