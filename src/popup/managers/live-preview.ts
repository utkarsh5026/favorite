/**
 * Live preview management
 * Handles real-time preview of images as the user hovers over them
 */

import type { LivePreviewMessage } from '../../types';
import { byID } from '@/utils';
import { loadSettings } from '@/extension';
import { clipImageToShape } from '../../images/shape';

let backgroundPort: chrome.runtime.Port | null = null;

/**
 * Sets up the live preview connection to background script
 */
export function setupLivePreview(): void {
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
}

/**
 * Loads the original (vendor-provided) favicon from the current tab's content script
 */
export async function loadOriginalFavicon() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  const originalImg = byID<HTMLImageElement>('originalFaviconImage');
  if (!originalImg) return;

  const setPlaceholder = () => {
    originalImg.style.opacity = '0.3';
  };

  const setFaviconFallback = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      originalImg.src = `${parsedUrl.origin}/favicon.ico`;
    } catch {
      setPlaceholder();
    }
  };

  if (!tab?.id || !tab.url) {
    setPlaceholder();
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'getOriginalFavicon' });
    if (response?.originalFavicon) {
      originalImg.src = response.originalFavicon;
      return;
    }
  } catch {
    // Content script not available, fall through to fallback
  }
  setFaviconFallback(tab.url);
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
  const previewInfo = byID('livePreviewInfo');
  const imageTypeEl = byID('liveImageType');
  const imageSizeEl = byID('liveImageSize');

  if (!previewImage || !previewEmpty) return;

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

    if (previewInfo && imageInfo) {
      previewInfo.classList.add('opacity-100');
      if (imageTypeEl) imageTypeEl.textContent = imageInfo.imageType;
      if (imageSizeEl) imageSizeEl.textContent = `${imageInfo.width}x${imageInfo.height}`;
    }
  }
}
