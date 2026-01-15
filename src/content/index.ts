/**
 * Content script entry point
 * Coordinates all content script modules and manages initialization
 */

import { init, cleanup } from './initialization';
import { handleContextMenuAction } from './context-menu';
import { state } from '@/extension';
import { restoreOriginalFavicon, resetToOriginal } from '@/favicons';
import type { ContextMenuMessage } from './types';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init().then(() => console.log('Image Favicon Preview: Init complete'));
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Handle messages from background script
chrome.runtime.onMessage.addListener(
  (message: ContextMenuMessage | { type: string }, _sender, sendResponse) => {
    if (message.type === 'getOriginalFavicon') {
      sendResponse({ originalFavicon: state.originalFavicon });
      return false;
    }

    if (message.type === 'RESTORE_ORIGINAL_FAVICON') {
      const hostname = window.location.hostname;
      resetToOriginal(hostname).then(() => {
        restoreOriginalFavicon();
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.type !== 'contextMenuAction') return false;

    handleContextMenuAction(message as ContextMenuMessage)
      .then(() => sendResponse({ success: true }))
      .catch((err: Error) => sendResponse({ success: false, error: err.message }));

    return true;
  }
);
