/**
 * Mouse event handlers for image hover/leave
 */
import { CONFIG, state, clearHoverTimeout, clearRestoreTimeout } from '@/extension';
import { changeFavicon, restoreToDefaultFavicon } from '@/favicons';
import { findImage, extractImageData, ImageExtractionResult } from '@/images';
import { scriptState } from './state';
import { broadcastHoverState } from './broadcast';

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
    console.log('[Content] Hover ignored - disabled (global:', scriptState.isGloballyDisabled, 'site:', scriptState.isCurrentSiteDisabled, ')');
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
 * Briadcast the image to popup
 */
function broadcastToPopup(img: Element, imageResult: ImageExtractionResult) {
  state.currentHoveredElement = img;
  changeFavicon(imageResult.url);

  const { width, height } = img.getBoundingClientRect();
  broadcastHoverState(imageResult.url, {
    width: Math.round(width),
    height: Math.round(height),
    imageType: imageResult.type.toUpperCase(),
  });
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

/**
 *  Adds event listeners for mouse events
 */
export function addListeners() {
  document.addEventListener('mouseover', handleImageHover);
  document.addEventListener('mouseout', handleImageLeave);
}

/**
 *  Removes event listeners for mouse events
 */
export function removeListeners() {
  document.removeEventListener('mouseover', handleImageHover);
  document.removeEventListener('mouseout', handleImageLeave);
}
