/**
 * Custom favicon management for site-specific defaults
 */
import { changeFavicon, getCustomFavicon } from '@/favicons';
import { scriptState, imageLocker } from './state';

/**
 * Checks for custom favicon and applies it
 */
export async function checkCustomFavicon(): Promise<void> {
  const hostname = window.location.hostname;
  const customFavicon = await getCustomFavicon(hostname);

  if (!customFavicon) return;

  scriptState.setCustomFaviconUrl(customFavicon.url);
  setTimeout(() => {
    if (scriptState.customFaviconUrl && !imageLocker.isImageLocked) {
      changeFavicon(scriptState.customFaviconUrl);
    }
  }, 100);
}

/**
 * @deprecated Use initializeStorageListeners instead - custom favicon changes are now handled there
 */
export function listenForCustomFaviconChanges(): void {
  // Kept for backwards compatibility
}

/**
 * Refreshes the current favicon with the updated shape/size
 */
export function refreshCurrentFavicon(): void {
  imageLocker.refreshFavicon();
  if (scriptState.customFaviconUrl && !imageLocker.isImageLocked) {
    changeFavicon(scriptState.customFaviconUrl);
  }
}
