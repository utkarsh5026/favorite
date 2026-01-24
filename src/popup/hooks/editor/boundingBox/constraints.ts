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
 * Resize with aspect ratio constraint (for shapes).
 */
function resizeWithAspectRatio(
  handle: HandlePosition,
  startBox: BoundingBox,
  dx: number,
  dy: number,
  aspectRatio: number,
  minSize: number
): BoundingBox {
  const { x, y, width, height } = startBox;
  const isCorner = handle.length === 2;
  const isLeft = handle.includes('w');
  const isTop = handle.includes('n');

  let newSize: number;
  let newX = x;
  let newY = y;

  if (isCorner) {
    const horizontalDelta = isLeft ? -dx : dx;
    const verticalDelta = isTop ? -dy : dy;

    const delta =
      Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta;

    newSize = Math.max(minSize, width + delta);

    if (isLeft) {
      newX = x + width - newSize;
    }
    if (isTop) {
      newY = y + height - newSize;
    }
  } else if (handle === 'n' || handle === 's') {
    const newHeight =
      handle === 'n' ? Math.max(minSize, height - dy) : Math.max(minSize, height + dy);
    newSize = newHeight * aspectRatio;

    newX = x + (width - newSize) / 2;
    if (handle === 'n') {
      newY = y + height - newHeight;
    }
  } else {
    const newWidth = handle === 'w' ? Math.max(minSize, width - dx) : Math.max(minSize, width + dx);
    newSize = newWidth;

    newY = y + (height - newSize / aspectRatio) / 2;
    if (handle === 'w') {
      newX = x + width - newWidth;
    }
  }

  return {
    x: newX,
    y: newY,
    width: newSize,
    height: newSize / aspectRatio,
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
  imageBounds: { width: number; height: number }
): BoundingBox {
  const { x, y, width, height } = startBox;
  const newBox = { ...startBox };

  if (handle.includes('n')) {
    const bottom = y + height;
    const clampedTop = Math.max(0, y + dy);
    const clampedHeight = Math.max(minSize, bottom - clampedTop);
    newBox.y = bottom - clampedHeight;
    newBox.height = clampedHeight;
  }

  if (handle.includes('s')) {
    const clampedHeight = Math.max(minSize, Math.min(height + dy, imageBounds.height - y));
    newBox.height = clampedHeight;
  }

  if (handle.includes('w')) {
    const right = x + width;
    const clampedLeft = Math.max(0, x + dx);
    const clampedWidth = Math.max(minSize, right - clampedLeft);
    newBox.x = right - clampedWidth;
    newBox.width = clampedWidth;
  }

  if (handle.includes('e')) {
    const clampedWidth = Math.max(minSize, Math.min(width + dx, imageBounds.width - x));
    newBox.width = clampedWidth;
  }

  return newBox;
}
