/**
 * Live preview management
 * Handles real-time preview of images as the user hovers over them
 */

import type { LivePreviewMessage } from '../../types';
import { byID } from '@/utils';
import { loadSettings, getOriginalFaviconUrl, getCurrentTabHostname } from '@/extension';
import { clipImageToShape } from '../../images/shape';
import { getLockedImage } from './lock';

let backgroundPort: chrome.runtime.Port | null = null;

/**
 * Sets up the live preview connection to background script
 */
export async function setupLivePreview(): Promise<void> {
  backgroundPort = chrome.runtime.connect({ name: 'popup' });

  backgroundPort.onMessage.addListener((message: LivePreviewMessage) => {
    if (message.type === 'hover-update') {
      updateLivePreview(message.imageUrl, message.imageInfo);
    }
  });

  backgroundPort.onDisconnect.addListener(() => {
    backgroundPort = null;
  });

  loadOriginalFavicon();
  await checkAndShowLockedState();
}

/**
 * Loads the original (vendor-provided) favicon from the current tab's content script
 */
export async function loadOriginalFavicon() {
  const originalImg = byID<HTMLImageElement>('originalFaviconImage');
  if (!originalImg) return;

  const faviconUrl = await getOriginalFaviconUrl();

  if (faviconUrl) {
    originalImg.src = faviconUrl;
  } else {
    originalImg.style.opacity = '0.3';
  }
}

/**
 * Checks if the image is locked and shows the locked state
 */
async function checkAndShowLockedState(): Promise<void> {
  const hostname = await getCurrentTabHostname();
  if (!hostname) return;

  const lockedImage = await getLockedImage(hostname);

  const previewLocked = byID('livePreviewLocked');
  const previewEmpty = byID('livePreviewEmpty');
  const previewImage = byID<HTMLImageElement>('livePreviewImage');
  const lockedImageEl = byID<HTMLImageElement>('livePreviewLockedImage');

  if (lockedImage && previewLocked && lockedImageEl) {
    // Show locked state
    lockedImageEl.src = lockedImage.url;
    previewLocked.classList.remove('hidden');
    previewLocked.classList.add('flex');
    previewEmpty?.classList.add('hidden');
    previewImage?.classList.add('hidden');
  } else if (previewLocked) {
    // Hide locked state and show empty state
    previewLocked.classList.add('hidden');
    previewLocked.classList.remove('flex');
    previewEmpty?.classList.remove('hidden');
    previewImage?.classList.add('hidden');
  }
}

/**
 * Refreshes the locked state display
 * Call this when the lock state changes (e.g., after locking/unlocking)
 */
export async function refreshLockedState(): Promise<void> {
  await checkAndShowLockedState();
}

/**
 * Updates the live preview with the current hover image
 */
export async function updateLivePreview(
  imageUrl: string | null,
  imageInfo?: { width: number; height: number; imageType: string }
): Promise<void> {
  const previewImage = byID<HTMLImageElement>('livePreviewImage');
  const previewEmpty = byID('livePreviewEmpty');
  const previewLocked = byID('livePreviewLocked');
  const previewInfo = byID('livePreviewInfo');
  const imageTypeEl = byID('liveImageType');
  const imageSizeEl = byID('liveImageSize');

  if (!previewImage || !previewEmpty) return;

  // Check if image is locked - if so, keep showing locked state
  const hostname = await getCurrentTabHostname();
  if (hostname) {
    const lockedImage = await getLockedImage(hostname);

    if (lockedImage) {
      // Keep locked state visible, don't update preview
      previewImage.classList.add('hidden');
      previewEmpty.classList.add('hidden');
      previewLocked?.classList.remove('hidden');
      previewLocked?.classList.add('flex');
      previewInfo?.classList.remove('opacity-100');
      return;
    }
  }

  // Hide locked state if not locked
  previewLocked?.classList.add('hidden');
  previewLocked?.classList.remove('flex');

  if (!imageUrl) {
    previewImage.classList.add('hidden');
    previewEmpty.classList.remove('hidden');
    previewInfo?.classList.remove('opacity-100');
    return;
  }

  const settings = await loadSettings();

  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    clipImageToShape(
      64, // Preview size (matches w-16 h-16 container)
      settings.faviconShape,
      img,
      () => {
        previewImage.src = imageUrl;
        showLivePreview();
      },
      (maskedUrl) => {
        previewImage.src = maskedUrl;
        showLivePreview();
      }
    );
  };

  img.onerror = () => {
    previewImage.src = imageUrl;
    showLivePreview();
  };

  img.src = imageUrl;

  function showLivePreview(): void {
    previewImage?.classList.remove('hidden');
    previewEmpty?.classList.add('hidden');
    previewLocked?.classList.add('hidden');
    previewLocked?.classList.remove('flex');

    if (previewInfo && imageInfo) {
      previewInfo.classList.add('opacity-100');
      if (imageTypeEl) imageTypeEl.textContent = imageInfo.imageType;
      if (imageSizeEl) imageSizeEl.textContent = `${imageInfo.width}x${imageInfo.height}`;
    }
  }
}
