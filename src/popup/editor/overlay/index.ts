/**
 * Overlay module - shared base class and types for interactive overlays
 */

export { BaseOverlay } from './BaseOverlay';
export type { BaseOverlayConfig } from './BaseOverlay';

export type {
  HandlePosition,
  DragType,
  Point,
  DisplayBoundingBox,
} from './types';

export {
  HANDLE_POSITIONS,
  HANDLE_CURSORS,
  ACTION_BUTTON_ICONS,
} from './types';
