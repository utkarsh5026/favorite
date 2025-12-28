import { state } from './state';

/**
 * Changes the page favicon to the specified URL
 */
export function changeFavicon(imageUrl: string): void {
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
    changeFavicon(state.originalFavicon);
  }
}
