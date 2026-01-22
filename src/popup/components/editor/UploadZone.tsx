import { useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useUIStore, useEditorStore } from '@/popup/stores';

export function UploadZone() {
  const loadImage = useEditorStore((s) => s.loadImage);
  const showStatus = useUIStore((s) => s.showStatus);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        showStatus('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showStatus('File too large (max 5MB)');
        return;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) resolve(result);
            else reject(new Error('Failed to read file'));
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        await loadImage(dataUrl);
      } catch (error) {
        console.error('Failed to process file:', error);
        showStatus('Failed to load image');
      }
    },
    [loadImage, showStatus]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');

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
      e.target.value = '';
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      id="editorUploadZone"
      className="upload-zone"
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="w-12 h-12 text-text-tertiary mb-3" strokeWidth={1.5} />
      <p className="text-text-secondary text-sm mb-1">Drop an image here or click to upload</p>
      <p className="text-text-tertiary text-xs">PNG, JPG, SVG, ICO up to 5MB</p>
      <input
        ref={inputRef}
        id="editorUploadInput"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
