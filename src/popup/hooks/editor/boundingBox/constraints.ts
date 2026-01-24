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

type Change = {
  dx: number;
  dy: number;
};

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
    ? resizeWithAspectRatio(handle, startBox, dx, dy, aspectRatio, minSize, imageBounds)
    : resizeFree(handle, startBox, dx, dy, minSize, imageBounds);

  return constrainBox(newBox, config);
}

/**
 * Resize with aspect ratio constraint (for shapes).
 * Handles boundary constraints during resize to prevent overflow.
 */
function resizeWithAspectRatio(
  handle: HandlePosition,
  startBox: BoundingBox,
  dx: number,
  dy: number,
  aspectRatio: number,
  minSize: number,
  imageBounds: Rectangle
): BoundingBox {
  const { x, y, width, height } = startBox;
  const isCorner = handle.length === 2;
  const isLeft = handle.includes('w');
  const isTop = handle.includes('n');

  let newSize: number;
  let newX = x;
  let newY = y;

  if (isCorner) {
    console.log('Resizing from corner handle:', handle);
    const horizontalDelta = isLeft ? -dx : dx;
    const verticalDelta = isTop ? -dy : dy;

    const delta =
      Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta;

    newSize = Math.max(minSize, width + delta);

    if (isLeft) {
      newX = x + width - newSize;
      // Constrain to left boundary
      if (newX < 0) {
        newSize = x + width;
        newX = 0;
      }
    }
    if (isTop) {
      newY = y + height - newSize;
      // Constrain to top boundary
      if (newY < 0) {
        newSize = Math.min(newSize, y + height);
        newY = 0;
        if (isLeft) {
          newX = x + width - newSize;
        }
      }
    }
    // Constrain to right boundary
    if (!isLeft && newX + newSize > imageBounds.width) {
      newSize = imageBounds.width - newX;
    }
    // Constrain to bottom boundary
    if (!isTop && newY + newSize / aspectRatio > imageBounds.height) {
      newSize = (imageBounds.height - newY) * aspectRatio;
    }
  } else if (handle === 'n' || handle === 's') {
    console.log('Resizing from vertical handle:', handle);
    const newHeight =
      handle === 'n' ? Math.max(minSize, height - dy) : Math.max(minSize, height + dy);
    newSize = newHeight * aspectRatio;

    // Calculate centered X, then clamp to bounds
    newX = x + (width - newSize) / 2;
    if (newX < 0) {
      newX = 0;
    } else if (newX + newSize > imageBounds.width) {
      newX = imageBounds.width - newSize;
      if (newX < 0) {
        newX = 0;
        newSize = imageBounds.width;
      }
    }

    if (handle === 'n') {
      newY = y + height - newHeight;
      // Constrain to top boundary
      if (newY < 0) {
        const constrainedHeight = y + height;
        newSize = constrainedHeight * aspectRatio;
        newY = 0;
        newX = x + (width - newSize) / 2;
        if (newX < 0) newX = 0;
      }
    } else {
      // Constrain to bottom boundary
      if (newY + newSize / aspectRatio > imageBounds.height) {
        newSize = (imageBounds.height - newY) * aspectRatio;
        newX = x + (width - newSize) / 2;
        if (newX < 0) newX = 0;
      }
    }
  } else {
    console.log('Resizing from horizontal handle:', handle);
    const newWidth = handle === 'w' ? Math.max(minSize, width - dx) : Math.max(minSize, width + dx);
    newSize = newWidth;

    // Calculate centered Y, then clamp to bounds
    newY = y + (height - newSize / aspectRatio) / 2;
    if (newY < 0) {
      newY = 0;
    } else if (newY + newSize / aspectRatio > imageBounds.height) {
      newY = imageBounds.height - newSize / aspectRatio;
      if (newY < 0) {
        newY = 0;
        newSize = imageBounds.height * aspectRatio;
      }
    }

    if (handle === 'w') {
      newX = x + width - newWidth;
      if (newX < 0) {
        newSize = x + width;
        newX = 0;
        newY = y + (height - newSize / aspectRatio) / 2;
        if (newY < 0) newY = 0;
      }
    } else {
      // Constrain to right boundary
      if (newX + newSize > imageBounds.width) {
        newSize = imageBounds.width - newX;
        newY = y + (height - newSize / aspectRatio) / 2;
        if (newY < 0) newY = 0;
      }
    }
  }

  newSize = Math.max(minSize, newSize);

  return {
    x: newX,
    y: newY,
    width: newSize,
    height: newSize / aspectRatio,
  };
}

function moveCoordinate(cord: number, prevSize: number, newSize: number): number {
  return Math.min(cord + (prevSize - newSize) / 2, 0);
}

function calculateOppositeDimension(
  currDimension: 'h' | 'w',
  dimension: number,
  aspectRatio: number
): number {
  const result = currDimension === 'h' ? dimension * aspectRatio : dimension / aspectRatio;
  return Math.round(result); // Keeps pixels whole
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
