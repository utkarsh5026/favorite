import { useEditorStore, useUIStore } from '@/popup/stores';
import { useShallow } from 'zustand/shallow';
import { rotateImage, flipImage } from '@/popup/editor/transforms';
import { useState, useCallback } from 'react';

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

/**
 * Hook for image transformation operations (rotate, flip)
 * 
 * Provides methods to perform non-destructive image transformations with
 * automatic history tracking, loading states, and error handling. All
 * transformations are added to the undo/redo history.
 */
export function useImageTransform() {
  const currentImageUrl = useCurrentImageUrl();
  const pushToHistory = useEditorStore((s) => s.pushToHistory);
  const showStatus = useUIStore((s) => s.showStatus);
  const [isTransforming, setIsTransforming] = useState(false);

  /**
   * Generic transformation wrapper that handles loading states, error handling,
   * and history management for image transformations.
   */
  const transform = useCallback(
    async (transformFn: () => Promise<string>, failedMsg: string) => {
      setIsTransforming(true);
      try {
        const result = await transformFn();
        return pushToHistory(result);
      } catch {
        showStatus(failedMsg);
      } finally {
        setIsTransforming(false);
      }
    },
    [showStatus, pushToHistory]
  );

  /**
   * Rotates the current image by the specified degrees clockwise.
   * The transformation is performed on a canvas and the result is saved to history.
   */
  const rotate = useCallback(
    async (degrees: 90 | 180 | 270) => {
      if (!currentImageUrl) return;
      await transform(() => rotateImage(currentImageUrl, degrees), 'Failed to rotate image');
    },
    [transform, currentImageUrl]
  );

  /**
   * Flips the current image along the specified axis.
   * The transformation is performed on a canvas and the result is saved to history.
   */
  const flip = useCallback(
    async (direction: 'horizontal' | 'vertical') => {
      if (!currentImageUrl) return;
      await transform(() => flipImage(currentImageUrl, direction), 'Failed to flip image');
    },
    [transform, currentImageUrl]
  );

  return {
    flip,
    rotate,
    isTransforming,
  };
}

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

/**
 * Hook for managing shape overlay information and manipulation settings
 * 
 * Provides access to the current shape selection and manipulation state for
 * image overlays. Uses shallow comparison to optimize re-renders by only
 * updating when shape-related state changes. This is essential for shape
 * overlay editors and shape selection components.
 */
export function useShapeInfo() {
  return useEditorStore(useShallow(({ shapeManipulation, setShape, currentShape, setShapeManipulation }) => {
    return { shapeManipulation, setShape, currentShape, setShapeManipulation };
  }))
}