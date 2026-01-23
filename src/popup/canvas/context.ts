import { createContext, useContext } from 'react';
import { EMPTY_CANVAS_SIZE } from './constants';

export interface CanvasBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasContextValue {
  /** Scale factor from image-space to display-space */
  displayScale: number;
  /** Original image dimensions (before scaling) */
  imageWidth: number;
  imageHeight: number;
  /** Canvas element dimensions (after scaling) */
  canvasWidth: number;
  canvasHeight: number;
  /**
   * Get the boundary of the canvas relative to its container.
   * Uses getBoundingClientRect() so must be called during events/effects, not render.
   */
  getBoundary: () => CanvasBoundary;
  /** Ref to the container element for direct DOM access (e.g., drag coordinate calc) */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to the canvas element for direct DOM access (e.g., mouse position calc) */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const DEFAULT_CONTEXT: CanvasContextValue = {
  displayScale: 1,
  imageWidth: 0,
  imageHeight: 0,
  canvasWidth: EMPTY_CANVAS_SIZE,
  canvasHeight: EMPTY_CANVAS_SIZE,
  getBoundary: () => ({ x: 0, y: 0, width: EMPTY_CANVAS_SIZE, height: EMPTY_CANVAS_SIZE }),
  containerRef: { current: null },
  canvasRef: { current: null },
};

export const CanvasContext = createContext<CanvasContextValue>(DEFAULT_CONTEXT);

export function useCanvasContext(): CanvasContextValue {
  return useContext(CanvasContext);
}
