import { useEffect } from 'react';
import { usePreviewStore } from '../stores/previewStore';
import type { LivePreviewMessage } from '@/types';

const RECONNECT_DELAY_MS = 500;

export function useLivePreview() {
  const setLivePreview = usePreviewStore((state) => state.setLivePreview);
  const clearLivePreview = usePreviewStore((state) => state.clearLivePreview);

  useEffect(() => {
    let backgroundPort: chrome.runtime.Port | null = null;

    const connectToBackground = () => {
      if (backgroundPort) {
        try {
          backgroundPort.disconnect();
        } catch {}
        backgroundPort = null;
      }

      try {
        backgroundPort = chrome.runtime.connect({ name: 'popup' });

        backgroundPort.onMessage.addListener((message: LivePreviewMessage) => {
          if (message.type === 'hover-update') {
            if (message.imageUrl && message.processedImageUrl) {
              setLivePreview(message.processedImageUrl, message.imageInfo);
            } else {
              clearLivePreview();
            }
          }
        });

        backgroundPort.onDisconnect.addListener(() => {
          backgroundPort = null;
          setTimeout(() => {
            if (!backgroundPort) {
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
      if (backgroundPort) {
        try {
          backgroundPort.disconnect();
        } catch {}
      }
    };
  }, [setLivePreview, clearLivePreview]);
}
