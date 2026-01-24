export { ShapeSelector } from './ShapeSelector';

export type { ShapeManipulationData, HandlePosition, DragType, Point } from '../shapes/types';

export {
  DEFAULT_SHAPE_MANIPULATION,
  HANDLE_POSITIONS,
  SHAPE_CONSTRAINTS,
  HANDLE_CURSORS,
} from '../shapes/types';

export {
  normalizedToDisplay,
  displayToNormalized,
  constrainScale,
  constrainPosition,
  getShapeBoundingBox,
  calculateScaleFromDrag,
  getDistance,
} from '../shapes/utils';

export { ShapeOverlay } from './ShapeOverlay';
