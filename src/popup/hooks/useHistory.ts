import { useCallback } from 'react';
import { useEditorStore } from '@/popup/stores';

interface UseHistoryReturn {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Hook for managing image edit history (undo/redo)
 * Provides enhanced undo/redo with computed can* states
 */
export function useHistory(): UseHistoryReturn {
  const undoAction = useEditorStore((s) => s.undo);
  const redoAction = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo());
  const canRedo = useEditorStore((s) => s.canRedo());

  const undo = useCallback(() => {
    undoAction();
  }, [undoAction]);

  const redo = useCallback(() => {
    redoAction();
  }, [redoAction]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
