/**
 * Mouse event handlers for image hover/leave
 */
import { CONFIG, state, clearHoverTimeout, clearRestoreTimeout, loadSettings } from '@/extension';
import { changeFavicon, restoreToDefaultFavicon } from '@/favicons';
import {
  findImage,
  extractImageData,
  ImageExtractionResult,
  getImageAsDataUrl,
  fetchImageAsDataUrl,
} from '@/images';
import { addListeners as addEventListeners } from '@/utils';
import { scriptState } from './state';

const BROADCAST_THROTTLE = 100; // ms
const PREVIEW_SIZE = 64;

/**
 * Broadcasts hover state to popup via background script
 * Now includes pre-processed image data for instant display
 */
export async function broadcastHoverState(
  imageUrl: string | null,
  imageInfo?: { width: number; height: number; imageType: string },
  imgElement?: HTMLImageElement
): Promise<void> {
  const now = Date.now();
  if (imageUrl && now - scriptState.lastBroadcast < BROADCAST_THROTTLE) return;
  scriptState.updateLastBroadcast(now);

  const fetchImage = async () => {
    if (!imgElement) return null;
    const processedImage = getImageAsDataUrl(imgElement, PREVIEW_SIZE);
    if (!processedImage && imageUrl && !imageUrl.startsWith('data:')) {
      return await fetchImageAsDataUrl(imageUrl, PREVIEW_SIZE);
    }
    return processedImage;
  };

  const processedImageUrl = await fetchImage();
  const message = {
    type: 'hover-update',
    imageUrl,
    processedImageUrl: processedImageUrl || undefined,
    imageInfo,
  };

  chrome.runtime.sendMessage(message).catch((error) => {
    console.log('[Content] Failed to broadcast:', error);
  });
}

/**
 * Checks if an element meets minimum size requirements
 */
function meetsMinimumSize(element: Element): boolean {
  const { width, height } = element.getBoundingClientRect();
  return width >= CONFIG.minImageSize && height >= CONFIG.minImageSize;
}

/**
 * Handles mouseover events to change favicon on hover
 */
export function handleImageHover(event: MouseEvent): void {
  if (scriptState.isGloballyDisabled || scriptState.isCurrentSiteDisabled) {
    console.log(
      '[Content] Hover ignored - disabled (global:',
      scriptState.isGloballyDisabled,
      'site:',
      scriptState.isCurrentSiteDisabled,
      ')'
    );
    return;
  }

  clearHoverTimeout(state);
  clearRestoreTimeout(state);

  const target = event.target as Element;
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  state.currentHoverTimeout = window.setTimeout(() => {
    const imageElement = findImage(target, mouseX, mouseY);

    if (!imageElement || !meetsMinimumSize(imageElement)) {
      console.log('[Content] No valid image found or too small');
      state.currentHoverTimeout = null;
      return;
    }

    const imageResult = extractImageData(imageElement);

    if (imageResult && imageResult.url) {
      console.log('[Content] Image found, broadcasting to popup:', imageResult);
      broadcastToPopup(imageElement, imageResult);
    } else {
      console.log('[Content] No image data extracted');
    }

    state.currentHoverTimeout = null;
  }, CONFIG.hoverDelay);
}

/*
 * Broadcast the image to popup
 */
async function broadcastToPopup(img: Element, imageResult: ImageExtractionResult) {
  state.currentHoveredElement = img;
  changeFavicon(imageResult.url);

  const { width, height } = img.getBoundingClientRect();
  const settings = await loadSettings();

  await broadcastHoverState(
    imageResult.url,
    {
      width: Math.round(width),
      height: Math.round(height),
      imageType: imageResult.type.toUpperCase(),
    },
    img as HTMLImageElement
  );
}

/**
 * Handles mouseout events to restore original favicon
 */
export function handleImageLeave(_event: MouseEvent): void {
  clearHoverTimeout(state);
  state.currentHoveredElement = null;

  broadcastHoverState(null);

  state.currentRestoreTimeout = window.setTimeout(async () => {
    await restoreToDefaultFavicon(null);
    state.currentRestoreTimeout = null;
  }, CONFIG.restoreDelay);
}

let cleanupListeners: (() => void) | null = null;

/**
 *  Adds event listeners for mouse events
 */
export function addListeners() {
  cleanupListeners = addEventListeners(document, {
    mouseover: handleImageHover,
    mouseout: handleImageLeave,
  });
}

/**
 *  Removes event listeners for mouse events
 */
export function removeListeners() {
  cleanupListeners?.();
  cleanupListeners = null;
}
