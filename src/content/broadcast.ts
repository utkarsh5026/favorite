/**
 * Live preview broadcasting to popup
 */
import { scriptState } from './state';
import type { LivePreviewMessage } from './types';

// Throttle for hover broadcasts
const BROADCAST_THROTTLE = 100; // ms

/**
 * Broadcasts hover state to popup via background script
 */
export function broadcastHoverState(
  imageUrl: string | null,
  imageInfo?: { width: number; height: number; imageType: string }
): void {
  const now = Date.now();
  if (imageUrl && now - scriptState.lastBroadcast < BROADCAST_THROTTLE) return;
  scriptState.updateLastBroadcast(now);

  const message: LivePreviewMessage = {
    type: 'hover-update',
    imageUrl,
    imageInfo,
  };

  chrome.runtime.sendMessage(message).catch(() => {
    // Popup not open or background not ready, ignore
  });
}
