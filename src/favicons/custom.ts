import { byID } from '../utils';
import type { CustomFavicons } from '../types';

const CUSTOM_FAVICONS_KEY = 'customFavicons';
const CUSTOM_FAVICON_SECTION_ID = 'customFaviconSection';

/**
 * Gets the custom favicon for a specific hostname
 * @param hostname - The hostname to retrieve the custom favicon for
 * @returns The custom favicon object or null if not found
 */
export async function getCustomFavicon(hostname: string) {
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
