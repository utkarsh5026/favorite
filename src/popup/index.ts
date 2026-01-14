/**
 * Main popup entry point
 * Coordinates all popup modules and manages initialization
 */

import { loadFaviconPreview, listenForFaviconStatesChanges } from './managers/preview';
import { setupDownloadButton } from './managers/download';
import { setupBringToEditorButton } from './managers/bring-to-editor';
import { setupLivePreview } from './managers/live-preview';

import { setupToggles } from './ui/toggle';
import { setupResetButtons } from './ui/reset';
import { initButtons } from './ui/button';

import { setupTabs, switchToTab } from './tabs/manager';
import { setupEditorUI } from './editor';

import { getCurrentTabHostname } from '@/extension';

let currentFaviconUrl: string | null = null;

/**
 * Initializes hostname-specific features (preview, listeners)
 */
async function initializeHostnameFeatures(hostname: string | null): Promise<void> {
  if (!hostname) return;
  await loadFaviconPreview(hostname, (url) => {
    currentFaviconUrl = url;
  });

  listenForFaviconStatesChanges(() => {
    loadFaviconPreview(hostname, (url) => {
      currentFaviconUrl = url;
    });
  });
}

/**
 * Initializes the popup by loading settings, setting up UI components, and attaching event listeners
 */
async function init(): Promise<void> {
  const currentHostname = await getCurrentTabHostname();

  setupTabs();
  const pendingEdit = await chrome.storage.local.get('pendingEditImage');
  if (pendingEdit.pendingEditImage?.imageUrl) {
    switchToTab('editor');
  }

  await Promise.all([
    setupEditorUI(),
    setupToggles(currentHostname),
    setupLivePreview(),
    initializeHostnameFeatures(currentHostname),
  ]);

  initButtons();

  setupDownloadButton(
    () => currentFaviconUrl,
    () => currentHostname
  );

  setupBringToEditorButton(() => currentFaviconUrl);

  setupResetButtons(currentHostname, () => {
    location.reload();
  });
}

document.addEventListener('DOMContentLoaded', init);
