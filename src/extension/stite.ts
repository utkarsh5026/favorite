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

/**
 * Gets the current favicon URL from the current tab.
 * Falls back to tab.favIconUrl, then {origin}/favicon.ico if not available.
 */
export async function getFaviconDirectlyFromTab(): Promise<string | null> {
  const tab = await getCurrentTab();
  if (!tab) {
    return null;
  }

  if (tab.favIconUrl) {
    return tab.favIconUrl;
  }

  if (tab.url) {
    try {
      const parsedUrl = new URL(tab.url);
      return `${parsedUrl.origin}/favicon.ico`;
    } catch {
      return null;
    }
  }

  return null;
}
