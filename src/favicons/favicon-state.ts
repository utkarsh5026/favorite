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
 * Save a new favicon state for a hostname
 */
async function saveNewState(
  hostname: string,
  original: string,
  current: string
): Promise<FaviconState> {
  const states = await getFaviconStates();

  const newState: FaviconState = {
    original,
    current,
    timestamp: Date.now(),
  };

  states[hostname] = newState;
  await chrome.storage.local.set({ [FAVICON_STATES_KEY]: states });

  return newState;
}

/**
 * Get the favicon state for a specific hostname.
 * Returns null if no state exists - the content script must initialize state first
 * via initializeFaviconState() to ensure the true original is captured.
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
    const { current } = states[hostname];
    return saveNewState(hostname, originalUrl, current);
  }

  return saveNewState(hostname, originalUrl, originalUrl);
}

/**
 * Set the current favicon for a hostname (user's custom choice).
 * Requires state to already exist (content script must have initialized first).
 */
export async function setCurrentFavicon(hostname: string, faviconUrl: string): Promise<void> {
  const states = await getFaviconStates();
  if (!states[hostname]) {
    throw new Error('Favicon state not initialized - content script must initialize first');
  }

  const { original } = states[hostname];
  await saveNewState(hostname, original, faviconUrl);
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
