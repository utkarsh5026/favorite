/**
 * Global extension toggle UI
 * Handles the global enable/disable toggle for the entire extension
 */

import { byID, toggleClasses, setText } from '@/utils';
import { loadSettings } from '@/extension';
import { showStatus } from '@/extension';

/**
 * Checks if the extension is globally enabled
 * @returns Promise that resolves to true if the extension is enabled
 */
export async function isExtensionEnabled(): Promise<boolean> {
  const settings = await loadSettings();
  return settings.extensionEnabled;
}

/**
 * Updates the global toggle UI based on the enabled state
 * @param enabled - Whether the extension is enabled
 */
export function updateGlobalToggleUI(enabled: boolean): void {
  const globalToggle = byID('globalToggle');
  const powerBtn = byID('powerBtn');
  const statusText = byID('globalToggleStatus');

  toggleClasses(globalToggle, { disabled: !enabled });
  toggleClasses(powerBtn, { off: !enabled });
  setText(statusText, enabled ? 'Active' : 'Paused');
}

/**
 * Sets up the global extension toggle
 */
export async function setupGlobalToggle(): Promise<void> {
  const powerBtn = byID<HTMLButtonElement>('powerBtn');
  const enabled = await isExtensionEnabled();

  updateGlobalToggleUI(enabled);

  powerBtn?.addEventListener('click', async () => {
    const currentlyEnabled = await isExtensionEnabled();
    const newState = !currentlyEnabled;

    await chrome.storage.sync.set({ extensionEnabled: newState });
    updateGlobalToggleUI(newState);
    showStatus(newState ? 'Extension enabled' : 'Extension paused');
  });
}
