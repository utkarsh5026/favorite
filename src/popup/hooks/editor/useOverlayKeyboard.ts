import { useEffect } from 'react';
import { addListeners } from '@/utils';

interface UseOverlayKeyboardOptions {
  /** Callback when Enter is pressed */
  onApply: () => void;
  /** Callback when Escape is pressed */
  onCancel: () => void;
}

/**
 * Hook for handling overlay keyboard shortcuts.
 * - Enter: Apply the overlay action
 * - Escape: Cancel and close the overlay
 */
export function useOverlayKeyboard({ onApply, onCancel }: UseOverlayKeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onApply();
      }
    };

    return addListeners(document, { keydown: handleKeyDown });
  }, [onApply, onCancel]);
}
