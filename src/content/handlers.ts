/**
 * Mouse event handlers for image hover/leave
 */
import { CONFIG, state, clearHoverTimeout, clearRestoreTimeout } from '@/extension';
import { changeFavicon } from '@/favicons';
import { findImage, extractImageData } from '@/images';
import { scriptState, imageLocker } from './state';
import { broadcastHoverState } from './broadcast';
import { restoreToDefaultFavicon } from '@/favicons';

/**
 * Checks if an element meets minimum size requirements
 */
function meetsMinimumSize(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= CONFIG.minImageSize && rect.height >= CONFIG.minImageSize;
}

/**
 * Handles mouseover events to change favicon on hover
 */
export function handleImageHover(event: MouseEvent): void {
  if (
    scriptState.isGloballyDisabled ||
    scriptState.isCurrentSiteDisabled ||
    imageLocker.isImageLocked
  )
    return;

  clearHoverTimeout(state);
  clearRestoreTimeout(state);

  const target = event.target as Element;
  const mouseX = event.clientX;
  const mouseY = event.clientY;

  state.currentHoverTimeout = window.setTimeout(() => {
    const imageElement = findImage(target, mouseX, mouseY);

    if (!imageElement) {
      state.currentHoverTimeout = null;
      return;
    }

    if (!meetsMinimumSize(imageElement)) {
      state.currentHoverTimeout = null;
      return;
    }

    const imageResult = extractImageData(imageElement);

    if (imageResult && imageResult.url) {
      state.currentHoveredElement = imageElement;
      imageLocker.setCurrentHoveredImageUrl(imageResult.url);
      changeFavicon(imageResult.url);

      // Broadcast to popup for live preview
      const rect = imageElement.getBoundingClientRect();
      broadcastHoverState(imageResult.url, {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        imageType: imageResult.type.toUpperCase(),
      });
    }

    state.currentHoverTimeout = null;
  }, CONFIG.hoverDelay);
}

/**
 * Handles mouseout events to restore original favicon
 */
export function handleImageLeave(_event: MouseEvent): void {
  if (imageLocker.isImageLocked) return;

  clearHoverTimeout(state);
  state.currentHoveredElement = null;
  imageLocker.setCurrentHoveredImageUrl(null);

  // Clear live preview in popup
  broadcastHoverState(null);

  state.currentRestoreTimeout = window.setTimeout(() => {
    restoreToDefaultFavicon(scriptState.customFaviconUrl);
    state.currentRestoreTimeout = null;
  }, CONFIG.restoreDelay);
}

/**
 * Handles keyboard events for lock/unlock
 */
export function handleKeyDown(event: KeyboardEvent): void {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? event.metaKey : event.ctrlKey;

  if (modifierKey && event.altKey && event.code === 'KeyT') {
    event.preventDefault();
    if (imageLocker.isImageLocked) return imageLocker.showLockNotification(true, 'Already locked');
    if (!imageLocker.hoveredImageUrl)
      return imageLocker.showLockNotification(false, 'Hover over an image first');

    imageLocker.lockCurrentImage();
    return;
  }

  if (modifierKey && event.altKey && event.code === 'KeyU') {
    event.preventDefault();
    if (!imageLocker.isImageLocked) {
      return imageLocker.showLockNotification(false, 'No locked image');
    }
    imageLocker.unlockImage(scriptState.customFaviconUrl);
  }
}

/**
 *  Adds event listeners for mouse and keyboard events
 */
export function addListeners() {
  document.addEventListener('mouseover', handleImageHover);
  document.addEventListener('mouseout', handleImageLeave);
  document.addEventListener('keydown', handleKeyDown);
}

/**
 *  Removes event listeners for mouse and keyboard events
 */
export function removeListeners() {
  document.removeEventListener('mouseover', handleImageHover);
  document.removeEventListener('mouseout', handleImageLeave);
  document.removeEventListener('keydown', handleKeyDown);
}
