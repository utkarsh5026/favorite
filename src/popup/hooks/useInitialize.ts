import { useEffect } from 'react';
import { usePreviewStore, useEditorStore, useUIStore } from '@/popup/stores';
import { getItem, removeItem } from '@/extension/storage';
import { getCurrentTab, getCurrentTabHostname } from '@/extension/stite';
import type { PendingEditImage } from '../editor/types';

/**
 * Custom React hook for initializing the popup extension state on mount.
 * 
 * This hook performs the following initialization tasks:
 * - Loads the current browser tab information and initializes the editor for that tab
 * - Sets the hostname in the preview store for the current tab
 * - Checks for pending image edits in storage and loads them if found
 * - Switches to the editor tab if a pending edit image is detected
 * 
 * The hook runs once on component mount and handles all initialization errors gracefully
 * by logging them to the console.
 */
export function useInitialize() {
  const setHostname = usePreviewStore((state) => state.setHostname);
  const { loadImage, initializeForTab } = useEditorStore();
  const switchToTab = useUIStore((state) => state.switchToTab);

  useEffect(() => {
    const initialize = async () => {
      try {
        const tab = await getCurrentTab();

        if (tab?.id) {
          await initializeForTab(tab.id);
        }

        const hostname = await getCurrentTabHostname();
        setHostname(hostname);

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
