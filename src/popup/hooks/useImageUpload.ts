import { useState, useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UseImageUploadOptions {
  onUpload: (dataUrl: string) => Promise<void>;
}

interface UseImageUploadReturn {
  isDragging: boolean;
  isLoading: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClick: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useImageUpload({
  onUpload,
}: UseImageUploadOptions): UseImageUploadReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const showStatus = useUIStore((s) => s.showStatus);
  const inputRef = { current: null as HTMLInputElement | null };

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        showStatus('Please select an image file');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        showStatus('File too large (max 5MB)');
        return;
      }

      setIsLoading(true);

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
              resolve(result);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        await onUpload(dataUrl);
      } catch (error) {
        console.error('Failed to process file:', error);
        showStatus('Failed to load image');
      } finally {
        setIsLoading(false);
      }
    },
    [onUpload, showStatus]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        void processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        void processFile(files[0]);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return {
    isDragging,
    isLoading,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    handleClick,
    inputRef,
  };
}
