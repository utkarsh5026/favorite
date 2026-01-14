/**
 * Live preview management
 * Handles real-time preview of images as the user hovers over them
 */

import type { LivePreviewMessage } from '@/types';
import { byID, setVisible, toggleClasses, setText } from '@/utils';
import { loadSettings, getOriginalFaviconUrl } from '@/extension';
import { clipImageToShape } from '@/images';

const RECONNECT_DELAY_MS = 500;
const RECONNECT_RETRY_DELAY_MS = 1000;

let backgroundPort: chrome.runtime.Port | null = null;

/**
 * Connects to the background script with automatic reconnection
 */
function connectToBackground(): void {
  if (backgroundPort) {
    try {
      backgroundPort.disconnect();
    } catch {}
    backgroundPort = null;
  }

  try {
    backgroundPort = chrome.runtime.connect({ name: 'popup' });

    backgroundPort.onMessage.addListener((message: LivePreviewMessage) => {
      if (message.type === 'hover-update') {
        updateLivePreview(message.imageUrl, message.imageInfo);
      }
    });

    backgroundPort.onDisconnect.addListener(() => {
      backgroundPort = null;
      setTimeout(() => {
        if (!backgroundPort) {
          connectToBackground();
        }
      }, RECONNECT_DELAY_MS);
    });
  } catch (error) {
    console.error('[Popup] Failed to connect to background:', error);
    setTimeout(connectToBackground, RECONNECT_RETRY_DELAY_MS);
  }
}

/**
 * Sets up the live preview connection to background script
 */
export async function setupLivePreview(): Promise<void> {
  connectToBackground();
  loadOriginalFavicon();
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
  const previewLoading = byID('livePreviewLoading');

  if (!previewImage || !previewEmpty) return;

  if (!imageUrl) {
    setVisible(previewImage, false);
    setVisible(previewEmpty, true);
    toggleClasses(previewLoading, { hidden: true, flex: false });
    previewInfo?.classList.remove('opacity-100');
    return;
  }

  const settings = await loadSettings();

  // Show loading state while image loads
  setVisible(previewImage, false);
  setVisible(previewEmpty, false);
  toggleClasses(previewLoading, { hidden: false, flex: true });

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
    toggleClasses(previewLoading, { hidden: true, flex: false });
    previewImage.src = imageUrl;
    showLivePreview();
  };

  img.src = imageUrl;

  function showLivePreview(): void {
    setVisible(previewImage, true);
    setVisible(previewEmpty, false);
    toggleClasses(previewLoading, { hidden: true, flex: false });

    if (previewInfo && imageInfo) {
      previewInfo.classList.add('opacity-100');
      setText(imageTypeEl, imageInfo.imageType);
      setText(imageSizeEl, `${imageInfo.width}x${imageInfo.height}`);
    }
  }
}
