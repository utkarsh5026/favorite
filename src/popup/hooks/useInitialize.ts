import { useEffect } from 'react';
import { usePreviewStore } from '../stores/previewStore';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { getItem, removeItem } from '@/extension/storage';
import type { PendingEditImage } from '../editor/types';

export function useInitialize() {
  const setHostname = usePreviewStore((state) => state.setHostname);
  const { loadImage, initializeForTab } = useEditorStore();
  const switchToTab = useUIStore((state) => state.switchToTab);

  useEffect(() => {
    const initialize = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab?.id) {
          await initializeForTab(tab.id);
        }

        if (tab?.url) {
          try {
            const url = new URL(tab.url);
            setHostname(url.hostname);
          } catch {
            setHostname(null);
          }
        }

        const pendingEdit = await getItem<PendingEditImage>('pendingEditImage', undefined);

        if (pendingEdit?.imageUrl) {
          await loadImage(pendingEdit.imageUrl);
          await removeItem('pendingEditImage');
          switchToTab('editor');
        }
      } catch (error) {
        console.error('[Popup] Initialization error:', error);
      }
    };

    initialize();
  }, [setHostname, loadImage, initializeForTab, switchToTab]);
}
