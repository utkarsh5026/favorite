import { CONFIG, state } from './state';
import type { CustomFavicons } from './types';
import JSZip from 'jszip';
import { resizeImage } from './image';
import { byID, downloadZip, all } from './utils';
import { maskWithShape } from './shape';

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
const applyShapeMaskAndSetFavicon = (imageUrl: string) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    try {
      maskWithShape(
        CONFIG.faviconSize,
        CONFIG.faviconShape,
        img,
        () => {
          setFaviconDirectly(imageUrl);
        },
        (dataUrl: string) => {
          setFaviconDirectly(dataUrl);
        }
      );
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
 * Gets the custom favicon for a specific hostname
 * @param hostname - The hostname to retrieve the custom favicon for
 * @returns The custom favicon object or null if not found
 */
async function getCustomFavicon(hostname: string) {
  const customFavicons = await getCustomFavicons();
  return customFavicons[hostname] || null;
}

/**
 * Sets a custom favicon for a specific hostname
 * @param hostname - The hostname to set the custom favicon for
 * @param faviconURL - The URL of the custom favicon
 * @param onSuccess - Callback function to execute on successful save
 */
export async function setCustomFavicon(
  hostname: string,
  faviconURL: string,
  onSuccess: () => void
) {
  const customFavicon = {
    url: faviconURL,
    timestamp: Date.now(),
  };

  const customFavicons = await getCustomFavicons();
  customFavicons[hostname] = customFavicon;

  await chrome.storage.local.set({ customFavicons });

  onSuccess();
  await loadCustomFaviconSection(hostname);
}

/**
 * Retrieves all custom favicons from chrome storage
 * @returns Object containing all custom favicons keyed by hostname
 */
async function getCustomFavicons() {
  const result = await chrome.storage.local.get(CUSTOM_FAVICONS_KEY);
  return (result.customFavicons || {}) as CustomFavicons;
}

/**
 * Loads and displays the custom favicon section in the UI
 * @param hostname - The hostname to load the custom favicon section for
 */
export async function loadCustomFaviconSection(hostname: string): Promise<void> {
  const customSection = byID(CUSTOM_FAVICON_SECTION_ID);
  const customImage = byID<HTMLImageElement>('customFaviconImage');
  const customHint = byID('customFaviconHint');

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

/**
 * Removes a custom favicon for a specific hostname
 * @param hostname - The hostname to remove the custom favicon for
 * @param onRemove - Callback function to execute after removal
 */
export async function removeCustomFavicon(hostname: string, onRemove: () => void): Promise<void> {
  const customFavicons = await getCustomFavicons();
  delete customFavicons[hostname];

  await chrome.storage.local.set({ customFavicons });

  onRemove();

  const customSection = byID(CUSTOM_FAVICON_SECTION_ID);
  if (customSection) {
    customSection.classList.remove('visible');
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
