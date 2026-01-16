/**
 * Settings management module
 * Handles loading and saving user settings from Chrome storage
 */

import type { UserSettings } from './types';
import { DEFAULT_SETTINGS } from './state';
import { byID } from '@/utils';
import { resetToOriginal } from '@/favicons';
import { getItems, setItems, removeItem } from './storage';

/**
 * Loads user settings from Chrome storage
 * @returns Promise that resolves to the user settings object
 */
export async function loadSettings(): Promise<UserSettings> {
  const keys = Object.keys(DEFAULT_SETTINGS);
  const result = await getItems<UserSettings>(keys, 'sync', 'Failed to load settings');
  return { ...DEFAULT_SETTINGS, ...result };
}

/**
 * Saves user settings to Chrome storage and displays a status message
 * @param settings - Partial user settings object to save
 */
export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  await setItems(settings, 'sync');
  showStatus('Settings saved');
}

/**
 * Displays a temporary status message to the user
 * @param message - The message to display
 */
export function showStatus(message: string): void {
  const status = byID('status');
  if (status) {
    status.textContent = message;
    status.classList.add('show');
    setTimeout(() => {
      status.classList.remove('show');
    }, 1500);
  }
}

/**
 * Resets all settings to defaults and clears all site-specific data
 */
export async function resetAllSettings(): Promise<void> {
  await setItems(DEFAULT_SETTINGS, 'sync');
  await removeItem('faviconStates', 'local');
}

/**
 * Resets settings for a specific site only
 * @param hostname - The hostname of the site to reset
 */
export async function resetSiteSettings(hostname: string): Promise<void> {
  const settings = await loadSettings();
  const disabledSites = settings.disabledSites.filter((site) => site !== hostname);
  await setItems({ disabledSites }, 'sync');

  await resetToOriginal(hostname);
}
