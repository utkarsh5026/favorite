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

  // Load original favicon from current tab
  loadOriginalFavicon();
}

/**
 * Loads the original (vendor-provided) favicon from the current tab's content script
 */
export async function loadOriginalFavicon(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  const originalImg = byID<HTMLImageElement>('originalFaviconImage');
  if (!originalImg) return;

  if (!tab?.id) {
    originalImg.style.opacity = '0.3';
    return;
  }

  try {
    // Request the original favicon from the content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'getOriginalFavicon' });
    if (response?.originalFavicon) {
      originalImg.src = response.originalFavicon;
    } else if (tab.url) {
      // Fallback: use the default favicon.ico path
      const url = new URL(tab.url);
      originalImg.src = `${url.origin}/favicon.ico`;
    } else {
      originalImg.style.opacity = '0.3';
    }
  } catch {
    // Content script not available, fallback to tab favicon or default
    if (tab.url) {
      try {
        const url = new URL(tab.url);
        originalImg.src = `${url.origin}/favicon.ico`;
      } catch {
        originalImg.style.opacity = '0.3';
      }
    } else {
      originalImg.style.opacity = '0.3';
    }
  }
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

  // Apply current shape to preview
  const settings = await loadSettings();

  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    clipImageToShape(
      48, // Preview size
      settings.faviconShape,
      img,
      () => {
        // Fallback: use original image
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
    // Still show the image even if masking fails
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
