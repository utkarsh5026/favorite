import { useEditorStore } from '@/popup/stores';
import { useShallow } from 'zustand/shallow';

/**
 * Hook for managing shape overlay information and manipulation settings
 *
 * Provides access to the current shape selection and manipulation state for
 * image overlays. Uses shallow comparison to optimize re-renders by only
 * updating when shape-related state changes. This is essential for shape
 * overlay editors and shape selection components.
 */
export function useShapeInfo() {
  return useEditorStore(
    useShallow(({ shapeManipulation, setShape, currentShape, setShapeManipulation }) => {
      return { shapeManipulation, setShape, currentShape, setShapeManipulation };
    })
  );
}
