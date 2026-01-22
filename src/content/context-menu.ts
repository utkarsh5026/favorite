/**
 * Context menu action handlers
 */
import { saveFaviconZIP, changeFavicon, setCurrentFavicon, restoreToDefaultFavicon } from '@/favicons';
import type { ContextMenuMessage } from './types';
import { CONTEXT_MENU } from '@/extension';
import { createEl, setEl, loadImage } from '@/utils';

const notificationStyle: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '14px',
  maxWidth: '360px',
  background: 'rgba(255, 255, 255, 0.95)',
  color: '#111827',
  padding: '14px 20px',
  borderRadius: '12px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '15px',
  fontWeight: '500',
  zIndex: '999999',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  backdropFilter: 'blur(20px)',
  transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
  opacity: '1',
  transform: 'translateY(0)',
};

const thumbnailStyle: Partial<CSSStyleDeclaration> = {
  width: '36px',
  height: '36px',
  borderRadius: '6px',
  objectFit: 'cover',
  flexShrink: '0',
};

/**
 * Shows a notification for context menu actions with optional image preview
 */
export function notify(message: string, imageUrl?: string): void {
  const children: HTMLElement[] = [];

  if (imageUrl) {
    children.push(
      createEl('img', undefined, { attributes: { src: imageUrl }, style: thumbnailStyle })
    );
  }
  children.push(createEl('span', undefined, { textContent: message }));

  const notification = createEl('div', undefined, { style: notificationStyle, children });
  document.body.appendChild(notification);

  setTimeout(() => {
    setEl(notification, {
      style: {
        opacity: '0',
        transform: 'translateY(-8px)',
      },
    });
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Downloads favicon from context menu action
 */
async function downloadFaviconFromContextMenu(imageUrl: string, hostname: string): Promise<void> {
  loadImage(
    imageUrl,
    async (img) => {
      try {
        await saveFaviconZIP(img, imageUrl, hostname);
        notify('Favicon downloaded', imageUrl);
      } catch (error) {
        console.error('Failed to download favicon:', error);
        notify('Download failed', imageUrl);
      }
    },
    () => notify('Failed to load image')
  );
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
      notify('Set as default favicon', imageUrl);
      break;

    case CONTEXT_MENU.DOWNLOAD:
      await downloadFaviconFromContextMenu(imageUrl, hostname);
      break;

    case CONTEXT_MENU.PREVIEW:
      changeFavicon(imageUrl, false); // false = don't apply shape (already applied by editor)
      notify('Preview applied', imageUrl);
      break;

    case CONTEXT_MENU.CLEAR_PREVIEW:
      await restoreToDefaultFavicon(null);
      break;
  }
}
