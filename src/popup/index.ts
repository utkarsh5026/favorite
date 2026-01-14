/**
 * Main popup entry point
 * Coordinates all popup modules and manages initialization
 */

import { byID } from '@/utils';

import { unlockImage, listenForLockedImageChanges } from './managers/lock';
import { loadFaviconPreview } from './managers/preview';
import { setupDownloadButton } from './managers/download';
import { setupDefaultImageButton } from './managers/default-image';
import { setupBringToEditorButton } from './managers/bring-to-editor';
import { setupLivePreview, refreshLockedState } from './managers/live-preview';

import { setupToggles } from './ui/toggle';
import { setupResetButtons } from './ui/reset';
import { initButtons } from './ui/button';

import { setupTabs, switchToTab } from './tabs/manager';
import { setupEditorUI } from './editor';

import { showStatus, getCurrentTabHostname } from '@/extension';
import { loadCustomFaviconSection, removeCustomFavicon } from '@/favicons';

let currentFaviconUrl: string | null = null;

/**
 * Initializes hostname-specific features (preview, listeners)
 */
async function initializeHostnameFeatures(hostname: string | null): Promise<void> {
  if (!hostname) return;
  await loadFaviconPreview(hostname, (url) => {
    currentFaviconUrl = url;
  });
  await loadCustomFaviconSection(hostname);

  listenForLockedImageChanges(hostname, () => {
    loadFaviconPreview(hostname, (url) => {
      currentFaviconUrl = url;
    });
    refreshLockedState();
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

  const unlockBtn = byID('unlockBtn');
  unlockBtn?.addEventListener('click', () => {
    unlockImage();
    currentFaviconUrl = null;
  });

  setupDefaultImageButton(
    () => currentFaviconUrl,
    () => currentHostname
  );

  setupBringToEditorButton(() => currentFaviconUrl);

  const removeDefaultBtn = byID('removeDefaultBtn');
  removeDefaultBtn?.addEventListener('click', () => {
    if (!currentHostname) return;
    removeCustomFavicon(currentHostname, () => {
      showStatus('Default removed');
    });
  });

  setupResetButtons(currentHostname, () => {
    location.reload();
  });
}

document.addEventListener('DOMContentLoaded', init);
