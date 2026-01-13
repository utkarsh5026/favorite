/**
 * Site management utilities
 * Handles tab queries, hostname extraction, and site-specific settings
 */

import { loadSettings } from './settings';

/**
 * Gets the hostname of the current active tab
 * @returns Promise that resolves to the hostname or null if unavailable
 */
export async function getCurrentTabHostname(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url) {
    return null;
  }

  try {
    const url = new URL(tab.url);
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * Gets the current active tab
 * @returns Promise that resolves to the active tab or null if unavailable
 */
export async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

/**
 * Checks if the extension is disabled for a specific site
 * @param hostname - The hostname to check
 * @returns Promise that resolves to true if the site is disabled, false otherwise
 */
export async function isSiteDisabled(hostname: string): Promise<boolean> {
  const settings = await loadSettings();
  return settings.disabledSites.includes(hostname);
}

/**
 * Toggles the enabled/disabled state for a specific site
 * @param hostname - The hostname to toggle
 * @returns Promise that resolves to true if site was disabled, false if enabled
 */
export async function toggleSite(hostname: string) {
  const settings = await loadSettings();
  const disabledSites = [...settings.disabledSites];
  const index = disabledSites.indexOf(hostname);

  if (index === -1) {
    disabledSites.push(hostname);
  } else {
    disabledSites.splice(index, 1);
  }

  await chrome.storage.sync.set({ disabledSites });
  return index === -1;
}
