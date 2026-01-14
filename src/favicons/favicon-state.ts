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
 * Get the favicon state for a specific hostname
 */
export async function getFaviconState(hostname: string): Promise<FaviconState | null> {
  const states = await getFaviconStates();
  return states[hostname] || null;
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
 * Check if a site has a custom favicon (current differs from original)
 */
export async function hasCustomFavicon(hostname: string): Promise<boolean> {
  const state = await getFaviconState(hostname);
  if (!state) return false;
  return state.current !== state.original;
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

/**
 * Remove favicon state for a hostname (full reset)
 */
export async function removeFaviconState(hostname: string): Promise<void> {
  const states = await getFaviconStates();
  delete states[hostname];
  await chrome.storage.local.set({ [FAVICON_STATES_KEY]: states });
}
