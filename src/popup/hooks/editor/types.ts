export type RotationDegrees = 90 | 180 | 270;

export type FlipDirection = 'horizontal' | 'vertical';


/**
 * Handle position identifiers for the 8-point resize system
 * - n, s, e, w: Edge handles (north, south, east, west)
 * - nw, ne, sw, se: Corner handles
 */
export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** All handle positions in consistent order */
export const HANDLE_POSITIONS: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/**
 * Types of drag operations
 * - 'move': Dragging the selection to reposition
 * - HandlePosition: Dragging a specific handle to resize
 * - null: No drag in progress
 */
export type DragType = 'move' | HandlePosition | null;

/** Bounding box in display coordinates */
export interface DisplayBoundingBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Cursor styles for each handle position */
export const HANDLE_CURSORS: Record<HandlePosition, string> = {
    nw: 'nw-resize',
    n: 'n-resize',
    ne: 'ne-resize',
    e: 'e-resize',
    se: 'se-resize',
    s: 's-resize',
    sw: 'sw-resize',
    w: 'w-resize',
};
