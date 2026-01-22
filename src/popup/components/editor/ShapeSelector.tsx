import { useCallback } from 'react';
import type { FaviconShape } from '@/types';
import { useEditorStore, useUIStore } from '@/popup/stores';

interface ShapeConfig {
  shape: FaviconShape;
  title: string;
  svgContent: string;
}

const SHAPES: ShapeConfig[] = [
  {
    shape: 'circle',
    title: 'Circle Shape',
    svgContent: '<circle cx="12" cy="12" r="10"/>',
  },
  {
    shape: 'rounded',
    title: 'Rounded Shape',
    svgContent: '<rect x="3" y="3" width="18" height="18" rx="4" ry="4"/>',
  },
  {
    shape: 'square',
    title: 'Square Shape',
    svgContent: '<rect x="3" y="3" width="18" height="18"/>',
  },
  {
    shape: 'heart',
    title: 'Heart Shape',
    svgContent:
      '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  },
  {
    shape: 'hexagon',
    title: 'Hexagon Shape',
    svgContent: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/>',
  },
];

interface ShapeSelectorProps {
  disabled?: boolean;
}

export function ShapeSelector({ disabled = false }: ShapeSelectorProps) {
  const { currentShape, setShape, setShapeManipulation, hasImage } =
    useEditorStore();
  const enterShapeEditMode = useUIStore((s) => s.enterShapeEditMode);

  const handleShapeClick = useCallback(
    (shape: FaviconShape) => {
      if (shape === 'square') {
        // Square shape applies immediately (no manipulation needed)
        setShape(shape);
        setShapeManipulation(null);
      } else if (hasImage()) {
        // For non-square shapes, enter shape edit mode
        enterShapeEditMode(shape);
      } else {
        // No image loaded, just set the shape for when image is loaded
        setShape(shape);
      }
    },
    [setShape, setShapeManipulation, hasImage, enterShapeEditMode]
  );

  return (
    <div id="shapeSelector" className="shape-selector">
      {SHAPES.map(({ shape, title, svgContent }) => (
        <button
          key={shape}
          className={`editor-btn shape-btn${currentShape === shape ? ' active' : ''}`}
          title={title}
          data-shape={shape}
          disabled={disabled}
          style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          onClick={() => handleShapeClick(shape)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </button>
      ))}
    </div>
  );
}
