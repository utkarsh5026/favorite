import { LockedImage } from './types';
import { changeFavicon, restoreToDefaultFavicon } from '@/favicons';
import { clearRestoreTimeout, type ExtensionState } from '@/extension';
import { convertToDataUrl } from '@/images/canvas';

export class ImageLocker {
  private static readonly FAVICON_NOTIFICATION = 'favicon-lock-notification';

  private currentHoveredImageUrl: string | null = null;
  private isLocked: boolean = false;
  private readonly state: ExtensionState;

  constructor(state: ExtensionState) {
    this.state = state;
  }

  /**
   * Checks for existing locked image on init
   */
  async checkAndInitialize(): Promise<void> {
    const result = await chrome.storage.local.get('lockedImage');
    const lockedImage = result.lockedImage as LockedImage | undefined;

    if (lockedImage && lockedImage.hostname === window.location.hostname) {
      this.isLocked = true;
      this.currentHoveredImageUrl = lockedImage.url;
      changeFavicon(lockedImage.url);
    }
  }

  /**
   * Locks the current hovered image
   */
  async lockCurrentImage(): Promise<void> {
    if (!this.currentHoveredImageUrl) return;

    this.isLocked = true;
    clearRestoreTimeout(this.state);

    const { url } = await convertToDataUrl(this.currentHoveredImageUrl);
    const dataUrl = url || this.currentHoveredImageUrl;

    const lockedImage: LockedImage = {
      url: dataUrl,
      hostname: window.location.hostname,
      timestamp: Date.now(),
    };

    this.currentHoveredImageUrl = dataUrl;
    await chrome.storage.local.set({ lockedImage });
    changeFavicon(dataUrl);
    this.showLockNotification(true);
  }

  /**
   * Unlocks the current image
   */
  async unlockImage(customFaviconUrl: string | null): Promise<void> {
    this.isLocked = false;
    this.currentHoveredImageUrl = null;

    await chrome.storage.local.remove('lockedImage');
    restoreToDefaultFavicon(customFaviconUrl);
    this.showLockNotification(false);
  }

  /**
   * Handles unlock triggered from popup
   */
  handleUnlockFromStorage(customFaviconUrl: string | null): void {
    this.isLocked = false;
    this.currentHoveredImageUrl = null;
    restoreToDefaultFavicon(customFaviconUrl);
  }

  /**
   * Shows a brief notification when locking/unlocking
   */
  showLockNotification(locked: boolean, customMessage?: string): void {
    const existingNotification = document.getElementById(ImageLocker.FAVICON_NOTIFICATION);
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = ImageLocker.FAVICON_NOTIFICATION;

    let message: string;
    if (customMessage) {
      message = customMessage;
    } else {
      message = locked ? '🔐 Image locked - Open popup to download' : '🔓 Image unlocked';
    }

    notification.className = `
      fixed top-6 right-6 z-[999999]
      w-auto max-w-sm
      inline-flex items-center gap-2.5
      px-4 py-3 rounded-lg
      ${
        locked
          ? 'bg-white/95 text-gray-900 shadow-lg shadow-black/10 border border-black/[0.06]'
          : 'bg-gray-900/95 text-gray-50 shadow-2xl shadow-black/40 border border-white/10'
      }
      backdrop-blur-xl
      font-medium text-sm tracking-tight
      transition-all duration-300 ease-out
      animate-in slide-in-from-top-2 fade-in
    `
      .trim()
      .replace(/\s+/g, ' ');

    if (locked && this.currentHoveredImageUrl) {
      const img = document.createElement('img');
      img.src = this.currentHoveredImageUrl;
      img.className =
        'w-7 h-7 rounded-md object-cover shrink-0 shadow-sm border border-black/[0.08]';
      notification.appendChild(img);
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    notification.appendChild(textSpan);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  setCurrentHoveredImageUrl(url: string | null): void {
    this.currentHoveredImageUrl = url;
  }

  /**
   * Refreshes the current favicon if an image is locked
   */
  refreshFavicon(): void {
    if (this.isLocked && this.currentHoveredImageUrl) {
      changeFavicon(this.currentHoveredImageUrl);
    }
  }

  get isImageLocked(): boolean {
    return this.isLocked;
  }

  get hoveredImageUrl(): string | null {
    return this.currentHoveredImageUrl;
  }
}
