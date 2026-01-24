
import { HANDLE_CURSORS, HandlePosition } from '@/popup/editor/overlay/types';

interface ResizeHandleProps {
  position: HandlePosition;
  classPrefix: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * A single resize handle for the 8-point resize system
 */
export function ResizeHandle({
  position,
  classPrefix,
  onMouseDown,
}: ResizeHandleProps) {
  return (
    <div
      className={`${classPrefix}-handle ${classPrefix}-handle-${position}`}
      data-position={position}
      style={{ cursor: HANDLE_CURSORS[position] }}
      onMouseDown={onMouseDown}
    />
  );
}
