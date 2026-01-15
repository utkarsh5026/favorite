/**
 * Favicon preview management
 * Handles loading and displaying favicon previews
 */

import { byID } from '@/utils';
import { loadSettings } from '@/extension';
import { getCurrentFaviconUrl } from '@/favicons';
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

    if (downloadBtn) downloadBtn.disabled = false;
    if (bringToEditorBtn) bringToEditorBtn.disabled = false;

    const settings = await loadSettings();
    await applyShapeToPreview(settings.faviconShape, faviconURL);
  };

  const currentFavicon = await getCurrentFaviconUrl(hostname);
  if (currentFavicon) {
    faviconImage.onload = async () => {
      await onImageLoaded(currentFavicon);
    };

    faviconImage.onerror = () => {
      faviconPreview.classList.add('error');
    };

    faviconImage.src = currentFavicon;
    return;
  }

  // No favicon available - show error state
  faviconPreview.classList.add('error');
}

/**
 * Listens for changes to faviconStates and triggers callback
 * Used to auto-refresh preview when "Set Default" is clicked in editor
 */
export function listenForFaviconStatesChanges(onChangeCallback: () => void): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.faviconStates) {
      onChangeCallback();
    }
  });
}
