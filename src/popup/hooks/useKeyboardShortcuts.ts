import { useEffect } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { addListeners } from '@/utils';

/**
 * Hook for handling keyboard shortcuts in the editor
 * - Ctrl+Z: Undo
 * - Ctrl+Y or Ctrl+Shift+Z: Redo
 * - Escape: Exit overlay mode (handled by overlays themselves)
 */
export function useKeyboardShortcuts() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const hasImage = useEditorStore((s) => s.hasImage);
  const overlayMode = useUIStore((s) => s.overlayMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (overlayMode !== 'none') return;
      if (!hasImage()) return;

      // Skip if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (isMod && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
    };

    const cleanup = addListeners(document, {
      keydown: handleKeyDown,
    });

    return cleanup;
  }, [overlayMode, hasImage, undo, redo]);
}
