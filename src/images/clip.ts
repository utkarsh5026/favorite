import { FaviconShape } from '@/types';

export type ShapeClipper = (ctx: CanvasRenderingContext2D, size: number) => void;

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
