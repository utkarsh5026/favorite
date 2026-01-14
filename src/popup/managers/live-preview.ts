/**
 * Live preview management
 * Handles real-time preview of images as the user hovers over them
 */

import type { LivePreviewMessage } from '@/types';
import { byID, setVisible, toggleClasses, setText } from '@/utils';
import { loadSettings, getOriginalFaviconUrl, getCurrentTabHostname } from '@/extension';
import { clipImageToShape } from '@/images';
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
    lockedImageEl.src = lockedImage.url;
    toggleClasses(previewLocked, { hidden: false, flex: true });
    setVisible(previewEmpty, false);
    setVisible(previewImage, false);
    return;
  }

  if (previewLocked) {
    toggleClasses(previewLocked, { hidden: true, flex: false });
    setVisible(previewEmpty, true);
    setVisible(previewImage, false);
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

  const hostname = await getCurrentTabHostname();
  if (hostname) {
    const lockedImage = await getLockedImage(hostname);

    if (lockedImage) {
      setVisible(previewImage, false);
      setVisible(previewEmpty, false);
      toggleClasses(previewLocked, { hidden: false, flex: true });
      previewInfo?.classList.remove('opacity-100');
      return;
    }
  }

  toggleClasses(previewLocked, { hidden: true, flex: false });

  if (!imageUrl) {
    setVisible(previewImage, false);
    setVisible(previewEmpty, true);
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
    setVisible(previewImage, true);
    setVisible(previewEmpty, false);
    toggleClasses(previewLocked, { hidden: true, flex: false });

    if (previewInfo && imageInfo) {
      previewInfo.classList.add('opacity-100');
      setText(imageTypeEl, imageInfo.imageType);
      setText(imageSizeEl, `${imageInfo.width}x${imageInfo.height}`);
    }
  }
}
