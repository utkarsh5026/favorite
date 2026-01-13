/**
 * Favicon preview management
 * Handles loading and displaying favicon previews
 */

import { byID } from '@/utils';
import { loadSettings } from '@/extension';
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
  const downloadBtn = byID<HTMLButtonElement>('downloadBtn');

  if (!faviconPreview || !faviconImage) return;

  const lockedImage = await getLockedImage(hostname);

  if (lockedImage) {
    updateLockUI(true);

    faviconImage.onload = async () => {
      onFaviconLoaded(lockedImage.url);
      faviconImage.classList.add('loaded');
      faviconPreview.classList.add('loaded');

      if (faviconSizeLabel) {
        faviconSizeLabel.textContent = `${faviconImage.naturalWidth}x${faviconImage.naturalHeight}`;
      }

      if (downloadBtn) {
        downloadBtn.disabled = false;
      }

      const settings = await loadSettings();
      await applyShapeToPreview(settings.faviconShape, lockedImage.url);
    };

    faviconImage.onerror = () => {
      faviconPreview.classList.add('error');
      updateLockUI(false);
    };

    faviconImage.src = lockedImage.url;
    return;
  }

  faviconPreview.classList.add('error');
  updateLockUI(false);
}
