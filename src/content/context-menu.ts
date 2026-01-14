/**
 * Context menu action handlers
 */
import { saveFaviconZIP, changeFavicon, setCurrentFavicon } from '@/favicons';
import type { ContextMenuMessage } from './types';
import { CONTEXT_MENU } from '@/extension';

/**
 * Shows a notification for context menu actions
 */
export function showContextMenuNotification(message: string): void {
  const notification = document.createElement('div');
  notification.className =
    'fixed top-6 right-6 bg-white/95 text-gray-900 px-[18px] py-[14px] rounded-xl font-sans text-[13px] font-medium z-[999999] shadow-[0_8px_32px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06)] border border-black/[0.06] backdrop-blur-xl transition-all duration-300 ease-out';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Downloads favicon from context menu action
 */
async function downloadFaviconFromContextMenu(imageUrl: string, hostname: string): Promise<void> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = async () => {
    try {
      await saveFaviconZIP(img, imageUrl, hostname);
      showContextMenuNotification('Favicon downloaded');
    } catch (error) {
      console.error('Failed to download favicon:', error);
      showContextMenuNotification('Download failed');
    }
  };

  img.onerror = () => {
    showContextMenuNotification('Failed to load image');
  };

  img.src = imageUrl;
}

/**
 * Handles context menu actions from background script
 */
export async function handleContextMenuAction(message: ContextMenuMessage): Promise<void> {
  const { action, imageUrl, hostname } = message;

  switch (action) {
    case CONTEXT_MENU.SET_DEFAULT:
      await setCurrentFavicon(hostname, imageUrl);
      changeFavicon(imageUrl);
      showContextMenuNotification('Set as default favicon');
      break;

    case CONTEXT_MENU.DOWNLOAD:
      await downloadFaviconFromContextMenu(imageUrl, hostname);
      break;

    case CONTEXT_MENU.PREVIEW:
      changeFavicon(imageUrl, false); // false = don't apply shape (already applied by editor)
      showContextMenuNotification('Preview applied (temporary)');
      break;
  }
}
