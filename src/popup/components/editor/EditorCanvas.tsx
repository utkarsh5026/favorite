import { Loader2 } from 'lucide-react';
import { useEditorStore, useUIStore } from '@/popup/stores';
import { useCanvasRenderer } from '@/popup/hooks';

interface EditorCanvasProps {
  children?: React.ReactNode;
}

export function EditorCanvas({ children }: EditorCanvasProps) {
  const currentImageUrl = useEditorStore((s) => s.currentImageUrl);
  const currentShape = useEditorStore((s) => s.currentShape);
  const shapeManipulation = useEditorStore((s) => s.shapeManipulation);
  const overlayMode = useUIStore((s) => s.overlayMode);

  const { canvasRef, containerRef, isLoading, canvasSize, displayScale, imageSize } =
    useCanvasRenderer({
      imageUrl: currentImageUrl,
      shape: currentShape,
      shapeManipulation,
      isShapeEditMode: overlayMode === 'shape',
    });

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
        className="editor-canvas"
        width={canvasSize.width}
        height={canvasSize.height}
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
