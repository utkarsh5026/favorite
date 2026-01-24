import { useRef, useCallback, useMemo } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useEditorStore, useUIStore } from '@/popup/stores';
import { useCanvasRenderer, useCurrentImageUrl, useImageUpload, useShapeInfo } from '@/popup/hooks';
import { CanvasContext, type CanvasContextValue } from '@/popup/canvas';

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

  const {
    setCanvasRef: canvasRef,
    canvasElRef,
    containerRef,
    isLoading,
    canvasSize,
    displayScale,
    imageSize,
    getBoundary,
  } = useCanvasRenderer({
    imageUrl: currentImageUrl,
    shape: currentShape,
    shapeManipulation,
    isShapeEditMode: overlayMode === 'shape',
  });

  const canvasContextValue: CanvasContextValue = useMemo(
    () => ({
      displayScale,
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      getBoundary,
      containerRef,
      canvasRef: canvasElRef,
    }),
    [displayScale, imageSize, canvasSize, getBoundary, containerRef, canvasElRef]
  );

  console.log('EditorCanvas rendered', isLoading, currentImageUrl);

  if (!currentImageUrl) {
    return (
      <div
        id="editorCanvasContainer"
        className="editor-canvas-container relative flex items-center justify-center mb-4"
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <button
            onClick={handleClick}
            className="group flex items-center gap-2 px-5 py-3 bg-white/15 border-2 border-white/30 rounded-lg hover:bg-white/25 hover:border-white/50 transition-all duration-200 shadow-lg"
          >
            <Upload className="w-4 h-4 text-white/80 group-hover:text-accent-green transition-colors" />
            <span className="text-white text-sm font-medium">Upload Image</span>
          </button>
          <p className="text-white/70 text-xs text-center max-w-50">
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
    <CanvasContext.Provider value={canvasContextValue}>
      <div
        id="editorCanvasContainer"
        ref={containerRef}
        className="editor-canvas-container relative flex items-center justify-center mb-4"
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

        {children}
      </div>
    </CanvasContext.Provider>
  );
}
