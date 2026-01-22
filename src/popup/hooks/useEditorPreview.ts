import { useEffect, useRef, useCallback } from 'react';
import { getCurrentTab, CONTEXT_MENU } from '@/extension';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { usePreviewStore } from '../stores/previewStore';
import { applyShapeToImage } from '../editor/transforms';

const PREVIEW_DEBOUNCE_MS = 100;

/**
 * Hook for sending live preview updates to the current tab
 */
export function useEditorPreview() {
  const currentImageUrl = useEditorStore((s) => s.currentImageUrl);
  const currentShape = useEditorStore((s) => s.currentShape);
  const shapeManipulation = useEditorStore((s) => s.shapeManipulation);
  const hasImage = useEditorStore((s) => s.hasImage);

  const livePreviewEnabled = useUIStore((s) => s.livePreviewEnabled);
  const currentHostname = usePreviewStore((s) => s.currentHostname);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendPreview = useCallback(async () => {
    if (!currentImageUrl) return;

    try {
      const imageUrl = await applyShapeToImage(
        currentImageUrl,
        currentShape,
        shapeManipulation
      );

      const tab = await getCurrentTab();
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'contextMenuAction',
          action: CONTEXT_MENU.PREVIEW,
          imageUrl,
          hostname: currentHostname || '',
        });
      }
    } catch (error) {
      console.error('Failed to send preview to tab:', error);
    }
  }, [currentImageUrl, currentShape, shapeManipulation, currentHostname]);

  // Debounced preview sending
  useEffect(() => {
    if (!livePreviewEnabled || !hasImage()) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void sendPreview();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    livePreviewEnabled,
    hasImage,
    currentImageUrl,
    currentShape,
    shapeManipulation,
    sendPreview,
  ]);

  return { sendPreview };
}
