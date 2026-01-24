import { useEditorStore } from '@/popup/stores';

/**
 * Hook for accessing the current image URL from the editor store
 *
 * Provides direct access to the currently active image URL in the editor.
 * This is useful for components that need to display or process the current
 * image without triggering unnecessary re-renders from other editor state changes.
 *
 * @returns {string | null} The current image URL as a data URL or blob URL, or null if no image is loaded
 */
export function useCurrentImageUrl(): string | null {
  return useEditorStore((s) => s.currentImageUrl);
}
