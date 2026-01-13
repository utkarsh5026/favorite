/**
 * Image lock management
 * Handles locking/unlocking images and managing the lock UI state
 */

import type { LockedImage } from '@/types';
import { byID } from '@/utils';
import { showStatus } from '@/extension';

/**
 * Retrieves the locked image for a specific hostname from storage
 * @param hostname - The hostname to get the locked image for
 * @returns Promise that resolves to the locked image or null if not found
 */
export async function getLockedImage(hostname: string): Promise<LockedImage | null> {
  const result = await chrome.storage.local.get('lockedImage');
  const lockedImage = result.lockedImage as LockedImage | undefined;
  if (lockedImage && lockedImage.hostname === hostname) {
    return lockedImage;
  }
  return null;
}

/**
 * Unlocks the currently locked image and resets the UI
 */
export async function unlockImage(): Promise<void> {
  await chrome.storage.local.remove('lockedImage');
  showStatus('Image unlocked');
  updateLockUI(false);

  const faviconPreview = byID('faviconPreview');
  const faviconImage = byID('faviconImage') as HTMLImageElement;
  const downloadBtn = byID('downloadBtn') as HTMLButtonElement;
  const downloadInfo = byID('downloadInfo');

  if (faviconPreview) {
    faviconPreview.classList.remove('loaded');
    faviconPreview.classList.add('error');
  }
  if (faviconImage) {
    faviconImage.classList.remove('loaded');
    faviconImage.src = '';
  }
  if (downloadBtn) {
    downloadBtn.disabled = true;
  }
  if (downloadInfo) {
    downloadInfo.innerHTML = 'Hover image + <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>L</kbd> to lock';
  }
}

/**
 * Updates the UI elements to reflect the locked/unlocked state
 * @param locked - True if an image is locked, false otherwise
 */
export function updateLockUI(locked: boolean): void {
  const lockBadge = byID('lockBadge');
  const unlockBtn = byID('unlockBtn');
  const faviconLabel = byID('faviconLabel');
  const downloadInfo = byID('downloadInfo');
  const setDefaultBtn = byID<HTMLButtonElement>('setDefaultBtn');

  if (lockBadge) {
    lockBadge.classList.toggle('visible', locked);
  }
  if (unlockBtn) {
    unlockBtn.classList.toggle('visible', locked);
  }
  if (faviconLabel) {
    faviconLabel.textContent = locked ? 'Locked Image' : 'Image';
  }
  if (downloadInfo && locked) {
    downloadInfo.textContent = 'Includes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256';
  }
  if (setDefaultBtn) {
    setDefaultBtn.disabled = !locked;
  }
}

/**
 * Listens for changes to the locked image and reloads preview
 */
export function listenForLockedImageChanges(hostname: string, onChangeCallback: () => void): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.lockedImage) {
      onChangeCallback();
    }
  });
}
