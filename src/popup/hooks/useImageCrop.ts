import { useState, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { executeTransform } from '../editor/transforms';
import { CropTransform } from '../editor/crop';
import type { CropData } from '../editor/crop/types';

interface UseImageCropReturn {
  cropImage: (cropData: CropData) => Promise<void>;
  isCropping: boolean;
}

/**
 * Hook for cropping images
 * Provides loading states and error handling for crop operations
 */
export function useImageCrop(): UseImageCropReturn {
  const currentImageUrl = useEditorStore((s) => s.currentImageUrl);
  const pushToHistory = useEditorStore((s) => s.pushToHistory);
  const showStatus = useUIStore((s) => s.showStatus);
  const [isCropping, setIsCropping] = useState(false);

  const cropImage = useCallback(
    async (cropData: CropData) => {
      if (!currentImageUrl) return;

      setIsCropping(true);
      try {
        const transformed = await executeTransform(
          currentImageUrl,
          new CropTransform(cropData)
        );
        pushToHistory(transformed);
      } catch (error) {
        console.error('Failed to crop image:', error);
        showStatus('Failed to crop image');
      } finally {
        setIsCropping(false);
      }
    },
    [currentImageUrl, pushToHistory, showStatus]
  );

  return {
    cropImage,
    isCropping,
  };
}
