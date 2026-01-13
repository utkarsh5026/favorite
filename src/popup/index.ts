/**
 * Main popup entry point
 * Coordinates all popup modules and manages initialization
 */

import { byID } from '@/utils';

import { unlockImage, listenForLockedImageChanges } from './managers/lock';
import { loadFaviconPreview } from './managers/preview';
import { setupDownloadButton } from './managers/download';
import { setupDefaultImageButton } from './managers/default-image';
import { setupLivePreview } from './managers/live-preview';

import { setupGlobalToggle } from './ui/global-toggle';
import { setupSiteToggle } from './ui/site-toggle';
import { setupShapeButtons } from './ui/shapes';
import { setupSliders } from './ui/sliders';
import { setupUploadZone } from './ui/upload';
import { setupResetButtons } from './ui/reset';

import { showStatus, loadSettings, getCurrentTabHostname } from '@/extension';
import { loadCustomFaviconSection, removeCustomFavicon } from '@/favicons';

let currentFaviconUrl: string | null = null;

/**
 * Initializes hostname-specific features (preview, listeners)
 */
async function initializeHostnameFeatures(hostname: string): Promise<void> {
  await loadFaviconPreview(hostname, (url) => {
    currentFaviconUrl = url;
  });
  await loadCustomFaviconSection(hostname);

  listenForLockedImageChanges(hostname, () => {
    loadFaviconPreview(hostname, (url) => {
      currentFaviconUrl = url;
    });
  });
}

/**
 * Initializes the popup by loading settings, setting up UI components, and attaching event listeners
 */
async function init(): Promise<void> {
  const settings = await loadSettings();
  const currentHostname = await getCurrentTabHostname();

  await setupGlobalToggle();
  setupSiteToggle(currentHostname);

  setupSliders(settings);
  setupShapeButtons(settings.faviconShape, () => currentFaviconUrl);
  setupUploadZone(currentHostname);
  setupLivePreview();

  if (currentHostname) {
    await initializeHostnameFeatures(currentHostname);
  }

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
