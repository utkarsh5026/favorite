import { useEffect, useRef, useCallback } from 'react';
import { getCurrentTab, CONTEXT_MENU } from '@/extension';
import { usePreviewStore, useUIStore } from '@/popup/stores';
import { useShape, useShapeInfo } from '../editor';
import { useCurrentImageUrl } from '../image';
import { clearTimeoutIfExists } from '@/utils';

/**
 * Debounce delay in milliseconds before sending preview updates.
 * Prevents excessive messages during rapid edits.
 */
const PREVIEW_DEBOUNCE_MS = 100;

/**
 * Custom React hook that manages live preview functionality for the favicon editor.
 *
 * The hook automatically:
 * - Applies shape transformations to the current image
 * - Sends the processed image to the content script for display
 * - Clears previews when live preview is disabled
 * - Cleans up pending timeouts on unmount
 *
 */
export function useEditorPreview() {
  const currentImageUrl = useCurrentImageUrl();
  const { currentShape, shapeManipulation } = useShapeInfo();
  const applyShape = useShape();

  const livePreviewEnabled = useUIStore((s) => s.livePreviewEnabled);
  const currentHostname = usePreviewStore((s) => s.currentHostname);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLivePreviewRef = useRef(livePreviewEnabled);

  /**
   * Sends the current editor state as a preview to the active tab.
   *
   * @throws Logs error if preview message fails to send
   */
  const sendPreview = useCallback(async () => {
    if (!currentImageUrl) {
      return;
    }

    try {
      const imageUrl = await applyShape(currentImageUrl, currentShape, shapeManipulation);
      await sendPreviewMessage(currentHostname, imageUrl, CONTEXT_MENU.PREVIEW);
    } catch (error) {
      console.error('Failed to send preview to tab:', error);
    }
  }, [currentImageUrl, applyShape, currentHostname, currentShape, shapeManipulation]);

  /**
   * Effect: Clear preview when live preview is disabled.
   *
   * Detects when live preview transitions from enabled to disabled
   * and sends a clear message to remove the preview from the page.
   */
  useEffect(() => {
    if (prevLivePreviewRef.current && !livePreviewEnabled) {
      sendPreviewMessage(currentHostname, '', CONTEXT_MENU.CLEAR_PREVIEW);
    }
    prevLivePreviewRef.current = livePreviewEnabled;
  }, [livePreviewEnabled, currentHostname]);

  /**
   * Effect: Debounced preview updates on editor changes.
   *
   * Monitors changes to:
   * - Live preview toggle state
   * - Current image URL
   * - Shape and manipulation parameters (via sendPreview dependencies)
   *
   * When any dependency changes, schedules a preview update after
   * PREVIEW_DEBOUNCE_MS to batch rapid consecutive changes.
   *
   * Cleanup function cancels pending updates to prevent stale previews.
   */
  useEffect(() => {
    if (!livePreviewEnabled || !currentImageUrl) {
      return;
    }
    clearTimeoutIfExists(debounceRef.current);
    debounceRef.current = setTimeout(sendPreview, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeoutIfExists(debounceRef.current);
  }, [livePreviewEnabled, currentImageUrl, sendPreview]);

  return { sendPreview };
}

/**
 * Sends a preview message to the active browser tab's content script.
 *
 * This helper function handles the communication between the popup and
 * the content script running on the active tab, enabling live preview
 * of favicon changes directly on the webpage.
 *
 */
async function sendPreviewMessage(
  currentHostname: string | null,
  imageUrl: string,
  action: (typeof CONTEXT_MENU)[keyof typeof CONTEXT_MENU]
) {
  const tab = await getCurrentTab();
  if (!tab || !tab.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'contextMenuAction',
      action,
      imageUrl,
      hostname: currentHostname || '',
    });
  } catch (error) {
    console.error('[sendPreviewMessage] Failed to send message:', error);
  }
}
