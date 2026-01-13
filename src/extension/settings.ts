/**
 * Settings management module
 * Handles loading and saving user settings from Chrome storage
 */

import type { UserSettings } from './types';
import { DEFAULT_SETTINGS } from './state';
import { byID } from '@/utils';

/**
 * Loads user settings from Chrome storage
 * @returns Promise that resolves to the user settings object
 */
export async function loadSettings(): Promise<UserSettings> {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return result as UserSettings;
}

/**
 * Saves user settings to Chrome storage and displays a status message
 * @param settings - Partial user settings object to save
 */
export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  await chrome.storage.sync.set(settings);
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
  await chrome.storage.sync.set(DEFAULT_SETTINGS);
  await chrome.storage.local.set({ customFavicons: {} });
  await chrome.storage.local.remove('lockedImage');
}

/**
 * Resets settings for a specific site only
 * @param hostname - The hostname of the site to reset
 */
export async function resetSiteSettings(hostname: string): Promise<void> {
  const settings = await loadSettings();
  const disabledSites = settings.disabledSites.filter((site) => site !== hostname);
  await chrome.storage.sync.set({ disabledSites });

  const { customFavicons = {} } = await chrome.storage.local.get('customFavicons');
  delete customFavicons[hostname];
  await chrome.storage.local.set({ customFavicons });

  const { lockedImage } = await chrome.storage.local.get('lockedImage');
  if (lockedImage?.hostname === hostname) {
    await chrome.storage.local.remove('lockedImage');
  }
}
