import type { Rectangle } from '@/types';
import type {
  AspectRatioConstraint,
  BoundingBox,
  BoundingBoxConfig,
  HandlePosition,
} from './types';

/** Internal config that includes image bounds */
export interface FullBoundingBoxConfig extends BoundingBoxConfig {
  imageBounds: Rectangle;
}

/**
 * Clamps a value between minimum and maximum bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function withAspectRatio(box: BoundingBox, aspectRatio: AspectRatioConstraint): BoundingBox {
  if (aspectRatio === null) {
    return box;
  }

  const size = Math.min(box.width, box.height);
  return {
    x: box.x,
    y: box.y,
    width: size,
    height: size / aspectRatio,
  };
}

/**
 * Constrains a bounding box to image bounds, respecting min size and aspect ratio.
 */
export function constrainBox(box: BoundingBox, config: FullBoundingBoxConfig): BoundingBox {
  const { minSize, aspectRatio, imageBounds } = config;
  let { x, y, width, height } = withAspectRatio(box, aspectRatio);

  width = clamp(width, minSize, imageBounds.width);
  height = clamp(height, minSize, imageBounds.height);

  if (aspectRatio !== null) {
    const maxSize = Math.min(imageBounds.width, imageBounds.height * aspectRatio);
    const size = clamp(width, minSize, maxSize);
    width = size;
    height = size / aspectRatio;
  }

  x = clamp(x, 0, imageBounds.width - width);
  y = clamp(y, 0, imageBounds.height - height);

  return { x, y, width, height };
}

/**
 * Moves a bounding box by delta, constraining to image bounds.
 */
export function moveBox(
  startBox: BoundingBox,
  dx: number,
  dy: number,
  config: FullBoundingBoxConfig
): BoundingBox {
  return constrainBox(
    {
      ...startBox,
      x: startBox.x + dx,
      y: startBox.y + dy,
    },
    config
  );
}

/**
 * Resizes a bounding box from a handle position.
 * Handles aspect ratio locking for all handles.
 */
export function resizeBox(
  handle: HandlePosition,
  startBox: BoundingBox,
  dx: number,
  dy: number,
  config: FullBoundingBoxConfig
): BoundingBox {
  const { aspectRatio, minSize, imageBounds } = config;

  const newBox = aspectRatio
    ? resizeWithAspectRatio(handle, startBox, dx, dy, aspectRatio, minSize)
    : resizeFree(handle, startBox, dx, dy, minSize, imageBounds);

  return constrainBox(newBox, config);
}

/**
 * Main Resize Function
 */
function resizeWithAspectRatio(
  handle: HandlePosition,
  startBox: BoundingBox,
  dx: number,
  dy: number,
  aspectRatio: number,
  minSize: number,
): BoundingBox {
  // 1. Identify Handle Type
  const isCorner = handle.length === 2;
  const isVertical = handle === 'n' || handle === 's';
  const isHorizontal = handle === 'w' || handle === 'e';

  let newBox = { ...startBox };

  if (isCorner) {
    newBox = resizeCorner(handle, startBox, dx, dy, aspectRatio, minSize);
  } else if (isVertical) {
    newBox = resizeVerticalEdge(handle, startBox, dy, aspectRatio, minSize);
  } else if (isHorizontal) {
    newBox = resizeHorizontalEdge(handle, startBox, dx, aspectRatio, minSize);
  }
  return newBox;
}

function resizeCorner(
  handle: string,
  box: BoundingBox,
  dx: number,
  dy: number,
  ratio: number,
  minSize: number
): BoundingBox {
  const { width, height, x, y } = box;
  const isLeft = handle.includes('w');
  const isTop = handle.includes('n');

  const hDelta = isLeft ? -dx : dx;
  const vDelta = isTop ? -dy : dy;
  const delta = Math.abs(hDelta) > Math.abs(vDelta) ? hDelta : vDelta;

  const newSize = Math.max(minSize, width + delta);

  return {
    width: newSize,
    height: newSize / ratio,
    x: isLeft ? x + width - newSize : x,
    y: isTop ? y + height - (newSize / ratio) : y
  };
}

function resizeVerticalEdge(
  handle: string,
  box: BoundingBox,
  dy: number,
  ratio: number,
  minSize: number
): BoundingBox {
  const { x, y, width, height } = box;
  const newHeight = handle === 'n'
    ? Math.max(minSize, height - dy)
    : Math.max(minSize, height + dy);

  const newWidth = newHeight * ratio;

  return {
    width: newWidth,
    height: newHeight,
    x: x + (width - newWidth) / 2,
    y: handle === 'n' ? y + height - newHeight : y
  };
}

function resizeHorizontalEdge(
  handle: string,
  box: BoundingBox,
  dx: number,
  ratio: number,
  minSize: number
): BoundingBox {
  const { width, height, x, y } = box;
  const newWidth = handle === 'w'
    ? Math.max(minSize, width - dx)
    : Math.max(minSize, width + dx);

  const newHeight = newWidth / ratio;

  return {
    width: newWidth,
    height: newHeight,
    x: handle === 'w' ? x + width - newWidth : x,
    y: y + (height - newHeight) / 2
  };
}

/**
 * Resize without aspect ratio constraint (for crop).
 */
function resizeFree(
  handle: HandlePosition,
  startBox: BoundingBox,
  dx: number,
  dy: number,
  minSize: number,
  imageBounds: Rectangle
): BoundingBox {
  let updates: Partial<BoundingBox> = {};
  const ydir = handle.includes('n') ? 'n' : handle.includes('s') ? 's' : null;
  const xdir = handle.includes('w') ? 'w' : handle.includes('e') ? 'e' : null;

  if (ydir) {
    updates = resizeY(startBox, dy, minSize, imageBounds.height, ydir);
  }

  if (xdir) {
    updates = {
      ...updates,
      ...resizeX(startBox, dx, minSize, imageBounds.width, xdir),
    };
  }

  return { ...startBox, ...updates };
}

function resizeY(
  start: BoundingBox,
  dy: number,
  minSize: number,
  imageHeight: number,
  direction: 'n' | 's'
): Partial<Pick<BoundingBox, 'height' | 'y'>> {
  const { y: top, height } = start;

  if (direction === 's') {
    const nh = height + dy;
    return {
      height: clamp(nh, minSize, imageHeight - top),
    };
  }

  const boxBottom = top + height;
  const clampedTop = Math.max(0, top + dy);
  const clampedHeight = Math.max(minSize, boxBottom - clampedTop);

  return {
    y: boxBottom - clampedHeight,
    height: clampedHeight,
  };
}

function resizeX(
  start: BoundingBox,
  dx: number,
  minSize: number,
  imageWidth: number,
  direction: 'w' | 'e'
): Partial<Pick<BoundingBox, 'width' | 'x'>> {
  const { x: left, width } = start;

  if (direction === 'e') {
    const nx = width + dx;
    return {
      width: clamp(nx, minSize, imageWidth - left),
    };
  }

  const right = left + width;
  const clampedLeft = Math.max(0, left + dx);
  const clampedWidth = Math.max(minSize, right - clampedLeft);

  return {
    x: right - clampedWidth,
    width: clampedWidth,
  };
}
