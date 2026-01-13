/**
 * Reset UI handlers
 * Handles resetting settings for current site or all sites
 */

import { byID, getActiveTab } from '@/utils';
import {
  resetAllSettings,
  resetSiteSettings,
  showStatus,
  getOriginalFaviconUrl,
} from '@/extension';

/**
 * Loads the original favicon into the reset site button
 */
async function loadOriginalFaviconIntoButton(): Promise<void> {
  const faviconImg = byID<HTMLImageElement>('resetSiteFavicon');
  if (!faviconImg) return;

  const originalFaviconUrl = await getOriginalFaviconUrl();
  if (originalFaviconUrl) {
    faviconImg.src = originalFaviconUrl;
  }
}

/**
 * Sets up the reset buttons for resetting site-specific or all settings
 * @param hostname - The current site's hostname
 * @param refreshUI - Callback to refresh the popup UI after reset
 */
export function setupResetButtons(hostname: string | null, refreshUI: () => void): void {
  const resetSiteBtn = byID<HTMLButtonElement>('resetSiteBtn');
  const resetAllBtn = byID<HTMLButtonElement>('resetAllBtn');

  loadOriginalFaviconIntoButton();

  resetSiteBtn?.addEventListener('click', async () => {
    if (!hostname) {
      showStatus('No site to reset');
      return;
    }

    await resetSiteSettings(hostname);
    await restoreOriginal(refreshUI);
    showStatus('Site settings reset');
  });

  resetAllBtn?.addEventListener('click', async () => {
    await resetAllSettings();
    await restoreOriginal(refreshUI);
    showStatus('All settings reset');
  });
}

async function restoreOriginal(refreshUI: () => void) {
  const tab = await getActiveTab();
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_ORIGINAL_FAVICON' });
  }

  refreshUI();
}
