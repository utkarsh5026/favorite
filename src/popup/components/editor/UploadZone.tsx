import { useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useEditorStore } from '@/popup/stores';
import { useImageUpload } from '@/popup/hooks';

export function UploadZone() {
  const loadImage = useEditorStore((s) => s.loadImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const { handleDragOver, handleDrop, handleDragLeave, handleFileSelect } = useImageUpload({
    onUpload: loadImage,
  });

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      id="editorUploadZone"
      className="upload-zone group flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-border-medium rounded-xl bg-white/2 cursor-pointer transition-all duration-200 ease-out text-center hover:border-border-strong hover:bg-white/4"
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white/4 border border-border-subtle mb-4 transition-all duration-200 group-hover:-translate-y-0.5">
        <Upload className="w-6 h-6 text-text-muted transition-colors duration-200 group-hover:text-accent-green" strokeWidth={1.5} />
      </div>
      <p className="text-text-secondary text-base font-medium mb-1">Drop an image here or click to upload</p>
      <p className="text-text-muted text-xs">PNG, JPG, SVG, ICO up to 5MB</p>
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
