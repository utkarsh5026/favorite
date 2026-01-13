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
