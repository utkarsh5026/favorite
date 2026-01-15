import type { FaviconState, FaviconStates } from '@/types';

const FAVICON_STATES_KEY = 'faviconStates';

/**
 * Get all favicon states from storage
 */
async function getFaviconStates(): Promise<FaviconStates> {
  const result = await chrome.storage.local.get(FAVICON_STATES_KEY);
  return (result[FAVICON_STATES_KEY] || {}) as FaviconStates;
}

/**
 * Get favicon URL from the tab matching the hostname
 */
async function getFaviconFromTab(hostname: string): Promise<string | null> {
  const tabs = await chrome.tabs.query({});
  const tab = tabs.find((t) => {
    if (!t.url) return false;
    try {
      const url = new URL(t.url);
      return url.hostname === hostname;
    } catch {
      return false;
    }
  });

  if (!tab) return null;

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

/**
 * Get the favicon state for a specific hostname
 * If state doesn't exist, attempts to get favicon from tab and initializes state
 */
export async function getFaviconState(hostname: string): Promise<FaviconState | null> {
  const states = await getFaviconStates();

  if (states[hostname]) {
    return states[hostname];
  }

  const faviconUrl = await getFaviconFromTab(hostname);
  if (!faviconUrl) {
    return null;
  }

  const newState: FaviconState = {
    original: faviconUrl,
    current: faviconUrl,
    timestamp: Date.now(),
  };

  states[hostname] = newState;
  await chrome.storage.local.set({ [FAVICON_STATES_KEY]: states });

  return newState;
}

/**
 * Initialize or get favicon state for a hostname
 * If state doesn't exist, creates one with original = current = provided URL
 * If state exists, returns existing state (preserves custom favicon)
 */
export async function initializeFaviconState(
  hostname: string,
  originalUrl: string
): Promise<FaviconState> {
  const states = await getFaviconStates();

  if (states[hostname]) {
    if (states[hostname].original !== originalUrl) {
      states[hostname].original = originalUrl;
      await chrome.storage.local.set({ [FAVICON_STATES_KEY]: states });
    }
    return states[hostname];
  }

  const newState: FaviconState = {
    original: originalUrl,
    current: originalUrl,
    timestamp: Date.now(),
  };

  states[hostname] = newState;
  await chrome.storage.local.set({ [FAVICON_STATES_KEY]: states });

  return newState;
}

/**
 * Set the current favicon for a hostname (user's custom choice)
 */
export async function setCurrentFavicon(hostname: string, faviconUrl: string): Promise<void> {
  const states = await getFaviconStates();

  if (!states[hostname]) {
    states[hostname] = {
      original: faviconUrl,
      current: faviconUrl,
      timestamp: Date.now(),
    };
  } else {
    states[hostname].current = faviconUrl;
    states[hostname].timestamp = Date.now();
  }

  await chrome.storage.local.set({ [FAVICON_STATES_KEY]: states });
}

/**
 * Reset a site's favicon to its original
 */
export async function resetToOriginal(hostname: string): Promise<string | null> {
  const states = await getFaviconStates();

  if (!states[hostname]) {
    return null;
  }

  states[hostname].current = states[hostname].original;
  states[hostname].timestamp = Date.now();

  await chrome.storage.local.set({ [FAVICON_STATES_KEY]: states });

  return states[hostname].original;
}

/**
 * Get the current favicon URL for a hostname (or null if not set)
 */
export async function getCurrentFaviconUrl(hostname: string): Promise<string | null> {
  const state = await getFaviconState(hostname);
  return state?.current || null;
}

/**
 * Get the original favicon URL for a hostname (or null if not set)
 */
export async function getOriginalFaviconUrl(hostname: string): Promise<string | null> {
  const state = await getFaviconState(hostname);
  return state?.original || null;
}
