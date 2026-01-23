import { useEditorStore } from '@/popup/stores';
import { useShallow } from 'zustand/shallow';

/**
 * Hook for managing image edit history (undo/redo)
 *
 * Provides access to the editor's undo/redo functionality with optimized
 * re-render behavior using shallow comparison. The hook automatically
 * tracks whether undo or redo operations are available.
 */
export function useHistory() {
  return useEditorStore(
    useShallow(({ undo, canRedo, canUndo, redo }) => ({
      undo,
      redo,
      canUndo,
      canRedo,
    }))
  );
}
