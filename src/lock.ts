import { LockedImage } from './types';
import { setupCanvas } from './utils';
import { changeFavicon, CustomFaviconManager } from './favicon';
import { clearRestoreTimeout } from './state';
import type { ExtensionState } from './types';

export class ImageLocker {
  private static FAVICON_NOTIFICATION = 'favicon-lock-notification';

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

    const dataUrl = await this.convertToDataUrl(this.currentHoveredImageUrl);

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
    CustomFaviconManager.restoreToDefaultFavicon(customFaviconUrl);
    this.showLockNotification(false);
  }

  /**
   * Handles unlock triggered from popup
   */
  handleUnlockFromStorage(customFaviconUrl: string | null): void {
    this.isLocked = false;
    this.currentHoveredImageUrl = null;
    CustomFaviconManager.restoreToDefaultFavicon(customFaviconUrl);
  }

  /**
   * Converts an image URL to a data URL using canvas
   */
  async convertToDataUrl(imageUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = setupCanvas(
            img.naturalWidth || img.width,
            img.naturalHeight || img.height
          );

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(imageUrl);
            return;
          }

          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (error) {
          resolve(imageUrl);
        }
      };

      img.onerror = () => {
        resolve(imageUrl);
      };

      img.src = imageUrl;
    });
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

    notification.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${locked ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 30, 0.95)'};
    color: ${locked ? '#1a1a1a' : '#f5f5f5'};
    padding: 14px 18px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
    z-index: 999999;
    box-shadow: 0 8px 32px rgba(0, 0, 0, ${locked ? '0.1' : '0.4'}),
                0 2px 8px rgba(0, 0, 0, ${locked ? '0.06' : '0.2'});
    border: 1px solid ${locked ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)'};
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateY(0);
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 1;
  `;

    if (locked && this.currentHoveredImageUrl) {
      const img = document.createElement('img');
      img.src = this.currentHoveredImageUrl;
      img.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.08);
    `;
      notification.appendChild(img);
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    notification.appendChild(textSpan);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-8px)';
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
