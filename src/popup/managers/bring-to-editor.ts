/**
 * Bring to Editor button manager
 * Handles loading the current favicon image into the editor
 */

import { byID } from '@/utils';
import { showStatus } from '@/extension';
import { loadImageIntoEditor } from '@/popup/editor';
import { switchToTab } from '@/popup/tabs/manager';

/**
 * Sets up the "Bring to Editor" button with its click handler
 * @param getFaviconUrl - Function that returns the current favicon URL
 */
export function setupBringToEditorButton(getFaviconUrl: () => string | null): void {
  const btn = byID<HTMLButtonElement>('bringToEditorBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const faviconUrl = getFaviconUrl();

    if (!faviconUrl) {
      showStatus('No image available');
      return;
    }

    try {
      btn.classList.add('loading');
      btn.disabled = true;

      await loadImageIntoEditor(faviconUrl);
      switchToTab('editor');

      btn.classList.remove('loading');
      btn.classList.add('success');

      setTimeout(() => {
        btn.classList.remove('success');
        btn.disabled = false;
      }, 500);

      showStatus('Opened in editor!');
    } catch (error) {
      console.error('Failed to bring image to editor:', error);
      showStatus('Failed to open in editor');

      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}
