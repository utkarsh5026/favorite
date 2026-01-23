import { useCallback, useEffect } from 'react';
import { usePreviewStore } from '@/popup/stores';
import type { LivePreviewMessage } from '@/types';
import { useShallow } from 'zustand/shallow';

/**
 * Delay in milliseconds before attempting to reconnect to the background script
 * after a connection is lost.
 */
const RECONNECT_DELAY_MS = 500;

/**
 * Hook that manages a persistent connection to the background script for live preview updates.
 *
 * Establishes a long-lived connection via chrome.runtime.connect and listens for hover-update
 * messages containing image preview data. Automatically handles reconnection if the connection
 * is lost.
 *
 * @returns An object containing:
 * - `livePreviewInfo`: Metadata about the currently previewed image
 * - `livePreviewUrl`: The URL of the processed preview image
 */
export function useLivePreview() {
  const setLivePreview = usePreviewStore((state) => state.setLivePreview);
  const clearLivePreview = usePreviewStore((state) => state.clearLivePreview);

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
     * Establishes a connection to the background script and sets up message listeners.
     * Automatically attempts to reconnect if the connection is lost.
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
