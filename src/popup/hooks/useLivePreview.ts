import { useEffect } from 'react';
import { usePreviewStore } from '@/popup/stores';
import type { LivePreviewMessage } from '@/types';

const RECONNECT_DELAY_MS = 500;

export function useLivePreview() {
  const setLivePreview = usePreviewStore((state) => state.setLivePreview);
  const clearLivePreview = usePreviewStore((state) => state.clearLivePreview);

  useEffect(() => {
    let port: chrome.runtime.Port | null = null;

    const connectToBackground = () => {
      if (port) {
        try {
          port.disconnect();
        } catch {}
        port = null;
      }

      try {
        port = chrome.runtime.connect({ name: 'popup' });

        port.onMessage.addListener((message: LivePreviewMessage) => {
          if (message.type != 'hover-update') {
            return;
          }

          const { imageUrl, imageInfo, processedImageUrl } = message;
          imageUrl && processedImageUrl
            ? setLivePreview(processedImageUrl, imageInfo)
            : clearLivePreview();
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

    return () => {
      if (port) {
        try {
          port.disconnect();
        } catch {}
      }
    };
  }, [setLivePreview, clearLivePreview]);
}
