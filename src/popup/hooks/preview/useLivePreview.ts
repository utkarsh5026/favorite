import { useCallback, useEffect } from 'react';
import { usePreviewStore } from '@/popup/stores';
import type { LivePreviewMessage } from '@/types';
import { useShallow } from 'zustand/shallow';

/**
 * Delay in milliseconds before attempting to reconnect to the background script
 * after a connection is lost. This helps to avoid rapid reconnection attempts
 */
const RECONNECT_DELAY_MS = 500;

/**
 * Custom React hook that manages real-time favicon preview when hovering over images on web pages.
 *
 * This hook establishes and maintains a persistent connection with the background script to receive
 * live preview updates when users hover over images in the browser. The connection is resilient and
 * automatically recovers from disconnections.
 *
 * @returns Object containing:
 * - `livePreviewInfo`: Metadata about the currently hovered image (alt text, dimensions, etc.)
 * - `livePreviewUrl`: Data URL of the processed preview image ready for display
 */
export function useLivePreview() {
  const setLivePreview = usePreviewStore((state) => state.setLivePreview);
  const clearLivePreview = usePreviewStore((state) => state.clearLivePreview);

  /**
   * Safely disconnects a Chrome runtime port connection.
   *
   * @param port - The Chrome runtime port to disconnect, or null if no connection exists
   */
  const disconnectPort = useCallback((port: chrome.runtime.Port | null) => {
    if (port) {
      try {
        port.disconnect();
      } catch {
        console.warn('[Popup] Error disconnecting port');
      }
    }
  }, []);

  useEffect(() => {
    let port: chrome.runtime.Port | null = null;

    /**
     * Establishes a connection to the background script and configures message handling.
     *
     * The connection is resilient - if it disconnects (e.g., due to extension reload,
     * context invalidation, or browser issues), it automatically attempts to reconnect
     * after a short delay.
     *
     * @throws Catches and logs any connection errors, then schedules a reconnection attempt
     */
    const connectToBackground = () => {
      if (port) {
        disconnectPort(port);
        port = null;
      }

      try {
        port = chrome.runtime.connect({ name: 'popup' });

        port.onMessage.addListener((message: LivePreviewMessage) => {
          if (message.type != 'hover-update') {
            return;
          }

          const { imageUrl, imageInfo, processedImageUrl } = message;
          if (imageUrl && processedImageUrl) {
            setLivePreview(processedImageUrl, imageInfo);
          } else {
            clearLivePreview();
          }
        });

        port.onDisconnect.addListener(() => {
          port = null;
          setTimeout(() => {
            if (!port) {
              connectToBackground();
            }
          }, RECONNECT_DELAY_MS);
        });
      } catch (error) {
        console.error('[Popup] Failed to connect to background:', error);
        setTimeout(connectToBackground, RECONNECT_DELAY_MS);
      }
    };

    connectToBackground();
    return () => disconnectPort(port);
  }, [setLivePreview, clearLivePreview, disconnectPort]);

  return usePreviewStore(
    useShallow(({ livePreviewInfo, livePreviewUrl }) => {
      return {
        livePreviewInfo,
        livePreviewUrl,
      };
    })
  );
}
