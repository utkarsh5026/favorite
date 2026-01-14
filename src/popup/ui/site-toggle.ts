/**
 * Per-site toggle UI
 * Handles enabling/disabling the extension for specific sites
 */

import { byID, toggleClasses, setText, setDisabled } from '@/utils';
import { isSiteDisabled, toggleSite } from '@/extension';
import { showStatus } from '@/extension';

/**
 * Sets up the site enable/disable toggle button and updates its state
 * @param hostname - The hostname to set up the toggle for, or null if unavailable
 */
export async function setupSiteToggle(hostname: string | null): Promise<void> {
  const siteNameEl = byID('siteName');
  const toggleBtn = byID<HTMLButtonElement>('toggleBtn');

  const updateToggleButton = (isDisabled: boolean, btn: HTMLButtonElement | null): void => {
    toggleClasses(btn, { disabled: isDisabled, active: !isDisabled });
  };

  toggleBtn?.addEventListener('click', async () => {
    if (!hostname) return;

    const disabled = await toggleSite(hostname);
    updateToggleButton(disabled, toggleBtn);
    showStatus(disabled ? 'Site disabled' : 'Site enabled');
  });

  if (siteNameEl && hostname) {
    siteNameEl.textContent = hostname;
    const disabled = await isSiteDisabled(hostname);
    updateToggleButton(disabled, toggleBtn);
    return;
  }

  if (siteNameEl) {
    siteNameEl.textContent = 'N/A';
    setDisabled(toggleBtn, true);
  }
}
