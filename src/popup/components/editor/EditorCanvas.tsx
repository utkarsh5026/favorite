import { useRef, useCallback } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useEditorStore, useUIStore } from '@/popup/stores';
import { useCanvasRenderer, useCurrentImageUrl, useImageUpload, useShapeInfo } from '@/popup/hooks';

interface EditorCanvasProps {
  children?: React.ReactNode;
}

export function EditorCanvas({ children }: EditorCanvasProps) {
  const currentImageUrl = useCurrentImageUrl();
  const { currentShape, shapeManipulation } = useShapeInfo();
  const loadImage = useEditorStore((s) => s.loadImage);
  const overlayMode = useUIStore((s) => s.overlayMode);

  const inputRef = useRef<HTMLInputElement>(null);
  const { handleFileSelect } = useImageUpload({ onUpload: loadImage });

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const { canvasRef, containerRef, isLoading, displayScale, imageSize } =
    useCanvasRenderer({
      imageUrl: currentImageUrl,
      shape: currentShape,
      shapeManipulation,
      isShapeEditMode: overlayMode === 'shape',
    });

  // Empty state with upload button
  if (!currentImageUrl) {
    return (
      <div
        id="editorCanvasContainer"
        className="editor-canvas-container relative flex items-center justify-center"
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <button
            onClick={handleClick}
            className="group flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 hover:border-white/20 transition-all duration-200"
          >
            <Upload className="w-4 h-4 text-text-muted group-hover:text-accent-green transition-colors" />
            <span className="text-text-secondary text-sm font-medium">Upload Image</span>
          </button>
          <p className="text-text-muted text-xs text-center max-w-50">
            or right-click any image on a page to edit it here
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div
      id="editorCanvasContainer"
      ref={containerRef}
      className="editor-canvas-container relative flex items-center justify-center"
      data-display-scale={displayScale}
      data-image-width={imageSize.width}
      data-image-height={imageSize.height}
    >
      <canvas
        id="editorCanvas"
        ref={canvasRef}
        className="editor-canvas border-2 border-red-500 rounded-lg"
      />

      {isLoading && (
        <div
          id="editorLoading"
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg"
        >
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Overlay components (CropOverlay, ShapeOverlay) are rendered here */}
      {children}
    </div>
  );
}
