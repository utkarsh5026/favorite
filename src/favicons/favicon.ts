import { CONFIG, state } from '@/extension';
import { all, setupCanvas } from '@/utils';
import { clipImageToShape } from '@/images';

const DEFAULT_FAVICON_SIZE = 32;

/**
 * Changes the page favicon to the specified URL with optional shape masking.
 *
 * This function provides two modes of operation:
 * 1. With shape masking (applyMask=true): Fetches the image, applies the configured shape mask,
 *    and displays a loading animation in the favicon until processing is complete.
 * 2. Without masking (applyMask=false): Directly sets the favicon to the specified URL
 *    without any processing or loading indicator.
 *
 * The function uses a loading ID system to handle race conditions when multiple favicon
 * changes are requested in quick succession. Only the most recent request will complete.
 *
 * @param imageUrl - The URL of the image to use as the favicon. Can be a data URL, blob URL,
 *                   or any valid image URL. Supported formats include PNG, SVG, ICO, GIF,
 *                   JPEG, and WebP.
 * @param applyMask - Whether to apply the configured shape mask to the image. Defaults to true.
 *                    Set to false when restoring the original favicon or when shape masking
 *                    is not desired.
 *
 * @remarks
 * - Automatically removes any existing favicon elements before setting the new one
 * - The loading animation is a visual indicator that the image is being processed
 * - If masking fails, the original image is used as a fallback
 * - Uses the singleton Loader instance to manage the loading animation
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
 * Saves the original favicon URL for later restoration.
 *
 * This function should be called before making any changes to the page's favicon to
 * ensure that the original can be restored later. It only saves the favicon once -
 * subsequent calls are ignored to preserve the truly original favicon.
 *
 * The function searches for existing favicon link elements in the document head and
 * stores the href of the first one found. If no favicon link element exists, it
 * defaults to '/favicon.ico' as a fallback.
 *
 * @remarks
 * - This function is idempotent - calling it multiple times will only save the favicon once
 * - The saved URL is stored in `state.originalFavicon`
 * - If no favicon is found, it assumes the default '/favicon.ico' path
 * - This function should be called during initialization or before the first favicon change
 */
export function saveOriginalFavicon(): void {
  if (state.originalFavicon !== null) return;

  const existingFavicon = document.querySelector<HTMLLinkElement>('link[rel*="icon"]');
  if (existingFavicon?.href) {
    state.originalFavicon = existingFavicon.href;
  } else {
    state.originalFavicon = '/favicon.ico';
  }
}

/**
 * Restores the page's original favicon that was previously saved.
 *
 * This function reverts the favicon to the URL that was saved by `saveOriginalFavicon()`.
 * The restoration is done without applying any shape masking to ensure the original
 * appearance is maintained exactly as it was.
 *
 * If no original favicon was saved (state.originalFavicon is null or undefined), this
 * function does nothing.
 *
 * @remarks
 * - Requires `saveOriginalFavicon()` to have been called previously
 * - The favicon is restored without shape masking (applyMask=false)
 * - Does not clear the saved original favicon - it can be restored again if needed
 * - No loading animation is shown during restoration
 *
 *
 * @see {@link saveOriginalFavicon} for saving the original favicon
 * @see {@link changeFavicon} for the underlying mechanism used to set the favicon
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

/**
 * Restores the favicon to either a custom default or the original page favicon.
 *
 * This function provides a smart restore mechanism that chooses between:
 * 1. A custom favicon URL if provided (with shape masking applied)
 * 2. The original page favicon if no custom URL is provided
 *
 * This is useful when the extension has a default custom favicon that should be used
 * instead of the page's original favicon, while still supporting complete restoration
 * to the page's original.
 *
 * @param customFaviconUrl - Optional URL of a custom default favicon. If provided,
 *                           this will be used with shape masking. If null or undefined,
 *                           the original page favicon is restored instead.
 */
export function restoreToDefaultFavicon(customFaviconUrl: string | null): void {
  if (customFaviconUrl) {
    changeFavicon(customFaviconUrl);
  } else {
    restoreOriginalFavicon();
  }
}
