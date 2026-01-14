/**
 * Favicon preview management
 * Handles loading and displaying favicon previews
 */

import { byID } from '@/utils';
import { loadSettings, getOriginalFaviconUrl } from '@/extension';
import { getLockedImage, updateLockUI } from './lock';
import { applyShapeToPreview } from '@/images';

/**
 * Loads and displays the favicon preview for a specific hostname
 * @param hostname - The hostname to load the favicon preview for
 * @param onFaviconLoaded - Callback when favicon URL is loaded, receives the favicon URL
 */
export async function loadFaviconPreview(
  hostname: string,
  onFaviconLoaded: (url: string) => void
): Promise<void> {
  const faviconPreview = byID('faviconPreview');
  const faviconImage = byID<HTMLImageElement>('faviconImage');
  const faviconSizeLabel = byID('faviconSizeLabel');

  if (!faviconPreview || !faviconImage) return;

  const lockedImage = await getLockedImage(hostname);

  const onImageLoaded = async (faviconURL: string) => {
    onFaviconLoaded(faviconURL);
    faviconImage.classList.add('loaded');
    faviconPreview.classList.add('loaded');

    if (faviconSizeLabel) {
      faviconSizeLabel.textContent = `${faviconImage.naturalWidth}x${faviconImage.naturalHeight}`;
    }

    // Enable all action buttons when image is loaded
    const downloadBtn = byID<HTMLButtonElement>('downloadBtn');
    const bringToEditorBtn = byID<HTMLButtonElement>('bringToEditorBtn');
    const setDefaultBtn = byID<HTMLButtonElement>('setDefaultBtn');

    if (downloadBtn) downloadBtn.disabled = false;
    if (bringToEditorBtn) bringToEditorBtn.disabled = false;
    if (setDefaultBtn) setDefaultBtn.disabled = false;

    const settings = await loadSettings();
    await applyShapeToPreview(settings.faviconShape, faviconURL);
  };

  if (lockedImage) {
    updateLockUI(true);

    faviconImage.onload = async () => {
      await onImageLoaded(lockedImage.url);
    };

    faviconImage.onerror = () => {
      faviconPreview.classList.add('error');
      updateLockUI(false);
    };

    faviconImage.src = lockedImage.url;
    return;
  }

  const originalFavicon = await getOriginalFaviconUrl();
  if (originalFavicon) {
    updateLockUI(false);

    faviconImage.onload = async () => {
      await onImageLoaded(originalFavicon);
    };

    faviconImage.onerror = () => {
      faviconPreview.classList.add('error');
    };

    faviconImage.src = originalFavicon;
    return;
  }

  // No locked image and no site favicon - show error state
  faviconPreview.classList.add('error');
  updateLockUI(false);
}
