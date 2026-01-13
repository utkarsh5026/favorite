import type { ContextMenuAction, ContextMenuMessage } from './types';

const MENU_ITEMS: Array<{ id: string; title: string; action: ContextMenuAction }> = [
  { id: 'lock-favicon', title: 'Lock as Favicon', action: 'lock' },
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
    popupPort = port;
    port.onDisconnect.addListener(() => {
      popupPort = null;
    });
  }
});

// Relay hover messages from content script to popup (for live preview)
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === 'hover-update' && popupPort) {
    popupPort.postMessage(message);
  }
});
