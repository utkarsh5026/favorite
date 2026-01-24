import { FaviconShape } from '@/types';

export type ShapeClipper = (ctx: CanvasRenderingContext2D, size: number) => void;

/**
 * Centered clip function type - draws shape centered at specified position
 */
export type CenteredShapeClipper = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number
) => void;

const clipRounded = (ctx: CanvasRenderingContext2D, size: number) => {
  const cornerRadius = size * 0.2;
  const lineLength = size - cornerRadius;

  ctx.moveTo(cornerRadius, 0);

  ctx.lineTo(lineLength, 0);
  ctx.quadraticCurveTo(size, 0, size, cornerRadius);

  ctx.lineTo(size, lineLength);
  ctx.quadraticCurveTo(size, size, lineLength, size);

  ctx.lineTo(cornerRadius, size);
  ctx.quadraticCurveTo(0, size, 0, lineLength);

  ctx.lineTo(0, cornerRadius);
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
};

const clipCircle = (ctx: CanvasRenderingContext2D, size: number) => {
  const center = size / 2;
  const radius = size / 2;
  ctx.arc(center, center, radius, 0, Math.PI * 2);
};

const clipHexagon = (ctx: CanvasRenderingContext2D, size: number) => {
  const hexScale = size / 24;
  ctx.moveTo(12 * hexScale, 2 * hexScale);
  ctx.lineTo(21 * hexScale, 7 * hexScale);
  ctx.lineTo(21 * hexScale, 17 * hexScale);
  ctx.lineTo(12 * hexScale, 22 * hexScale);
  ctx.lineTo(3 * hexScale, 17 * hexScale);
  ctx.lineTo(3 * hexScale, 7 * hexScale);
  ctx.lineTo(12 * hexScale, 2 * hexScale);
};

const clipHeart = (ctx: CanvasRenderingContext2D, size: number) => {
  const scale = size / 24;
  ctx.moveTo(12 * scale, 21.35 * scale);
  ctx.lineTo(10.55 * scale, 20.03 * scale);
  ctx.bezierCurveTo(5.4 * scale, 15.36 * scale, 2 * scale, 12.28 * scale, 2 * scale, 8.5 * scale);
  ctx.bezierCurveTo(2 * scale, 5.42 * scale, 4.42 * scale, 3 * scale, 7.5 * scale, 3 * scale);
  ctx.bezierCurveTo(9.24 * scale, 3 * scale, 10.91 * scale, 3.81 * scale, 12 * scale, 5.09 * scale);
  ctx.bezierCurveTo(13.09 * scale, 3.81 * scale, 14.76 * scale, 3 * scale, 16.5 * scale, 3 * scale);
  ctx.bezierCurveTo(19.58 * scale, 3 * scale, 22 * scale, 5.42 * scale, 22 * scale, 8.5 * scale);
  ctx.bezierCurveTo(
    22 * scale,
    12.28 * scale,
    18.6 * scale,
    15.36 * scale,
    13.45 * scale,
    20.04 * scale
  );
  ctx.lineTo(12 * scale, 21.35 * scale);
};

const clipSquare: ShapeClipper = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.rect(0, 0, size, size);
};

export function getClipper(shape: FaviconShape): ShapeClipper {
  switch (shape) {
    case 'circle':
      return clipCircle;
    case 'rounded':
      return clipRounded;
    case 'hexagon':
      return clipHexagon;
    case 'heart':
      return clipHeart;
    case 'square':
    default:
      return clipSquare;
  }
}

// ============================================================================
// Centered clip functions - draw shapes centered at specified position
// Used for shape manipulation with position/scale parameters
// ============================================================================

const clipCircleCentered: CenteredShapeClipper = (ctx, centerX, centerY, size) => {
  const radius = size / 2;
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
};

const clipRoundedCentered: CenteredShapeClipper = (ctx, centerX, centerY, size) => {
  const halfSize = size / 2;
  const cornerRadius = size * 0.2;
  const left = centerX - halfSize;
  const top = centerY - halfSize;
  const right = centerX + halfSize;
  const bottom = centerY + halfSize;

  ctx.moveTo(left + cornerRadius, top);
  ctx.lineTo(right - cornerRadius, top);
  ctx.quadraticCurveTo(right, top, right, top + cornerRadius);
  ctx.lineTo(right, bottom - cornerRadius);
  ctx.quadraticCurveTo(right, bottom, right - cornerRadius, bottom);
  ctx.lineTo(left + cornerRadius, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - cornerRadius);
  ctx.lineTo(left, top + cornerRadius);
  ctx.quadraticCurveTo(left, top, left + cornerRadius, top);
};

const clipHexagonCentered: CenteredShapeClipper = (ctx, centerX, centerY, size) => {
  // Hexagon inscribed in the bounding box, scaled from 24-unit reference
  const scale = size / 24;
  // Original hexagon is centered at (12, 12) in a 24x24 box
  // Offset to move from (12, 12) center to (centerX, centerY)
  const offsetX = centerX - 12 * scale;
  const offsetY = centerY - 12 * scale;

  ctx.moveTo(12 * scale + offsetX, 2 * scale + offsetY);
  ctx.lineTo(21 * scale + offsetX, 7 * scale + offsetY);
  ctx.lineTo(21 * scale + offsetX, 17 * scale + offsetY);
  ctx.lineTo(12 * scale + offsetX, 22 * scale + offsetY);
  ctx.lineTo(3 * scale + offsetX, 17 * scale + offsetY);
  ctx.lineTo(3 * scale + offsetX, 7 * scale + offsetY);
  ctx.lineTo(12 * scale + offsetX, 2 * scale + offsetY);
};

const clipHeartCentered: CenteredShapeClipper = (ctx, centerX, centerY, size) => {
  // Heart scaled from 24-unit reference
  const scale = size / 24;
  // Original heart is roughly centered at (12, 12) in a 24x24 box
  const offsetX = centerX - 12 * scale;
  const offsetY = centerY - 12 * scale;

  ctx.moveTo(12 * scale + offsetX, 21.35 * scale + offsetY);
  ctx.lineTo(10.55 * scale + offsetX, 20.03 * scale + offsetY);
  ctx.bezierCurveTo(
    5.4 * scale + offsetX,
    15.36 * scale + offsetY,
    2 * scale + offsetX,
    12.28 * scale + offsetY,
    2 * scale + offsetX,
    8.5 * scale + offsetY
  );
  ctx.bezierCurveTo(
    2 * scale + offsetX,
    5.42 * scale + offsetY,
    4.42 * scale + offsetX,
    3 * scale + offsetY,
    7.5 * scale + offsetX,
    3 * scale + offsetY
  );
  ctx.bezierCurveTo(
    9.24 * scale + offsetX,
    3 * scale + offsetY,
    10.91 * scale + offsetX,
    3.81 * scale + offsetY,
    12 * scale + offsetX,
    5.09 * scale + offsetY
  );
  ctx.bezierCurveTo(
    13.09 * scale + offsetX,
    3.81 * scale + offsetY,
    14.76 * scale + offsetX,
    3 * scale + offsetY,
    16.5 * scale + offsetX,
    3 * scale + offsetY
  );
  ctx.bezierCurveTo(
    19.58 * scale + offsetX,
    3 * scale + offsetY,
    22 * scale + offsetX,
    5.42 * scale + offsetY,
    22 * scale + offsetX,
    8.5 * scale + offsetY
  );
  ctx.bezierCurveTo(
    22 * scale + offsetX,
    12.28 * scale + offsetY,
    18.6 * scale + offsetX,
    15.36 * scale + offsetY,
    13.45 * scale + offsetX,
    20.04 * scale + offsetY
  );
  ctx.lineTo(12 * scale + offsetX, 21.35 * scale + offsetY);
};

const clipSquareCentered: CenteredShapeClipper = (ctx, centerX, centerY, size) => {
  const halfSize = size / 2;
  ctx.rect(centerX - halfSize, centerY - halfSize, size, size);
};

/**
 * Get a centered clip function for the specified shape.
 * Centered clip functions draw shapes centered at a specified position.
 */
export function getCenteredClipper(shape: FaviconShape): CenteredShapeClipper {
  switch (shape) {
    case 'circle':
      return clipCircleCentered;
    case 'rounded':
      return clipRoundedCentered;
    case 'hexagon':
      return clipHexagonCentered;
    case 'heart':
      return clipHeartCentered;
    case 'square':
    default:
      return clipSquareCentered;
  }
}
