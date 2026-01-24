import { useCallback, useEffect } from 'react';
import type { FaviconShape } from '@/types';
import { useUIStore } from '@/popup/stores/uiStore';
import { useShapeOverlay, useShapePath, useShapeInfo } from '@/popup/hooks';
import { HANDLE_POSITIONS } from '@/popup/editor/overlay/types';
import { ResizeHandle } from './ResizeHandle';
import { OverlayActions } from './OverlayActions';
import { addListeners } from '@/utils';

const CLASS_PREFIX = 'shape';

/**
 * Interactive shape manipulation overlay
 */
export function ShapeOverlay() {
  const { setShape, setShapeManipulation, shapeManipulation } = useShapeInfo();
  const { pendingShape, exitOverlayMode, showStatus } = useUIStore();
  const { getShapeSVGPath } = useShapePath();

  const shape = (pendingShape as FaviconShape) || 'circle';

  const {
    state: manipulation,
    isDragging,
    startDrag,
    displayBox,
    selectionRef,
  } = useShapeOverlay({ shape, initialManipulation: shapeManipulation });

  const handleApply = useCallback(() => {
    setShape(shape);
    setShapeManipulation({
      shape,
      centerX: manipulation.centerX,
      centerY: manipulation.centerY,
      scale: manipulation.scale,
    });
    showStatus('Shape applied!');
    exitOverlayMode();
  }, [shape, manipulation, setShape, setShapeManipulation, exitOverlayMode, showStatus]);

  const handleCancel = useCallback(() => {
    exitOverlayMode();
  }, [exitOverlayMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      }
    };

    return addListeners(document, { keydown: handleKeyDown });
  }, [handleApply, handleCancel]);

  const shapePath = getShapeSVGPath(shape, displayBox.width);

  return (
    <div className={`${CLASS_PREFIX}-overlay ${isDragging ? 'dragging' : ''}`}>
      {/* SVG mask for darkened area outside shape */}
      <svg className={`${CLASS_PREFIX}-mask-svg`} width="100%" height="100%">
        <defs>
          <mask id="shapeMask">
            <rect width="100%" height="100%" fill="white" />
            <path
              d={shapePath}
              fill="black"
              transform={`translate(${displayBox.left}, ${displayBox.top})`}
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.6)" mask="url(#shapeMask)" />
      </svg>

      {/* Selection box with handles */}
      <div
        ref={selectionRef}
        className={`${CLASS_PREFIX}-selection ${isDragging ? 'dragging' : ''}`}
        style={{
          left: displayBox.left,
          top: displayBox.top,
          width: displayBox.width,
          height: displayBox.height,
        }}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.classList.contains(`${CLASS_PREFIX}-handle`) ||
            target.classList.contains(`${CLASS_PREFIX}-action-btn`) ||
            target.closest(`.${CLASS_PREFIX}-actions`)
          ) {
            return;
          }
          startDrag(e, 'move');
        }}
      >
        {/* Resize handles */}
        {HANDLE_POSITIONS.map((pos) => (
          <ResizeHandle
            key={pos}
            position={pos}
            classPrefix={CLASS_PREFIX}
            onMouseDown={(e) => {
              e.stopPropagation();
              startDrag(e, pos);
            }}
          />
        ))}

        {/* Action buttons */}
        <OverlayActions classPrefix={CLASS_PREFIX} onApply={handleApply} onCancel={handleCancel} />
      </div>
    </div>
  );
}
