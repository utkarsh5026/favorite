import type { ContextMenuAction, ContextMenuMessage } from './types';

const MENU_ITEMS: Array<{ id: string; title: string; action: ContextMenuAction }> = [
  { id: 'edit-image', title: 'Edit Image', action: 'edit' },
  { id: 'set-default-favicon', title: 'Set as Site Default', action: 'setDefault' },
  { id: 'download-favicon', title: 'Download as Favicon', action: 'download' },
];

/**
 * Creates all context menu items on extension install
 */
function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    MENU_ITEMS.forEach((item) => {
      chrome.contextMenus.create({
        id: item.id,
        title: item.title,
        contexts: ['image'],
      });
    });
  });
}

/**
 * Handles context menu item clicks
 */
function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): void {
  if (!tab?.id || !info.srcUrl) return;

  const menuItem = MENU_ITEMS.find((item) => item.id === info.menuItemId);
  if (!menuItem) return;

  let hostname = '';
  try {
    hostname = new URL(tab.url || '').hostname;
  } catch {
    console.error('Failed to parse tab URL');
    return;
  }

  // Handle 'edit' action specially - store in storage for popup to pick up
  if (menuItem.action === 'edit') {
    chrome.storage.local
      .set({
        pendingEditImage: {
          imageUrl: info.srcUrl,
          hostname,
          timestamp: Date.now(),
        },
      })
      .then(() => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Image Ready to Edit',
          message: 'Open the extension popup to edit this image.',
        });
      })
      .catch((error) => {
        console.error('Failed to store pending edit image:', error);
      });
    return;
  }

  const message: ContextMenuMessage = {
    type: 'contextMenuAction',
    action: menuItem.action,
    imageUrl: info.srcUrl,
    hostname,
  };

  chrome.tabs.sendMessage(tab.id, message).catch((error) => {
    console.error('Failed to send message to content script:', error);
  });
}

// Create context menus on install
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

// Also create menus on startup (in case extension was updated)
chrome.runtime.onStartup.addListener(() => {
  createContextMenus();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
let popupPort: chrome.runtime.Port | null = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    if (popupPort) {
      try {
        popupPort.disconnect();
      } catch {
        // Ignore errors from already disconnected port
      }
    }

    popupPort = port;

    port.onDisconnect.addListener(() => {
      if (popupPort === port) {
        popupPort = null;
      }
    });
  }
});

// Relay hover messages from content script to popup (for live preview)
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === 'hover-update' && popupPort) {
    popupPort.postMessage(message);
  }
});
