import { useCallback, useEffect } from 'react';
import { useUIStore } from '@/popup/stores';
import { useCanvasContext } from '@/popup/canvas';
import { HANDLE_POSITIONS } from '@/popup/editor/overlay/types';
import { ResizeHandle } from './ResizeHandle';
import { OverlayActions } from './OverlayActions';
import { useImageTransform, useCrop } from '@/popup/hooks';
import { addListeners } from '@/utils';

const CLASS_PREFIX = 'crop';
const MIN_CROP_SIZE = 16;

export function CropOverlay() {
  const { cropImage } = useImageTransform()
  const { isDragging, startDrag, state: crop } = useCrop({ minCropSize: MIN_CROP_SIZE });
  const { getBoundary, displayScale } = useCanvasContext();
  const exitOverlayMode = useUIStore((s) => s.exitOverlayMode);

  const handleApply = useCallback(async () => {
    try {
      await cropImage({
        x: Math.round(crop.x),
        y: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height),
      });
      exitOverlayMode();
    } catch (error) {
      console.error('Failed to apply crop:', error);
    }
  }, [crop, cropImage, exitOverlayMode]);

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
        void handleApply();
      }
    };

    const cleanup = addListeners(document, {
      keydown: handleKeyDown
    })

    return cleanup;
  }, [handleApply, handleCancel]);


  const boundary = getBoundary();
  const displayBox = {
    left: boundary.x + crop.x * displayScale,
    top: boundary.y + crop.y * displayScale,
    width: crop.width * displayScale,
    height: crop.height * displayScale,
  };

  return (
    <div className={`${CLASS_PREFIX}-overlay ${isDragging ? 'dragging' : ''}`}>
      {/* Darkened mask areas */}
      <div
        className={`${CLASS_PREFIX}-mask ${CLASS_PREFIX}-mask-top`}
        style={{ left: 0, top: 0, right: 0, height: displayBox.top }}
      />
      <div
        className={`${CLASS_PREFIX}-mask ${CLASS_PREFIX}-mask-bottom`}
        style={{
          left: 0,
          top: displayBox.top + displayBox.height,
          right: 0,
          bottom: 0,
        }}
      />
      <div
        className={`${CLASS_PREFIX}-mask ${CLASS_PREFIX}-mask-left`}
        style={{ left: 0, top: displayBox.top, width: displayBox.left, height: displayBox.height }}
      />
      <div
        className={`${CLASS_PREFIX}-mask ${CLASS_PREFIX}-mask-right`}
        style={{
          left: displayBox.left + displayBox.width,
          top: displayBox.top,
          right: 0,
          height: displayBox.height,
        }}
      />

      {/* Selection box */}
      <div
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
        {['h1', 'h2', 'v1', 'v2'].map((dir) => (
          <div key={dir} className={`${CLASS_PREFIX}-grid ${CLASS_PREFIX}-grid-${dir}`} />
        ))}

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
        <OverlayActions
          classPrefix={CLASS_PREFIX}
          onApply={() => void handleApply()}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
