import { useRef, useState, useCallback, useEffect } from 'react';
import { downloadImage } from '@/utils';
import { useShape } from './shape';
import {
  CHECKED_SQUARE_SIZE,
  EMPTY_CANVAS_SIZE,
  MAX_CANVAS_HEIGHT,
  CANVAS_PADDING,
  CONTAINER_MIN_WIDTH,
} from '@/popup/canvas';
import type { FaviconShape } from '@/types';
import type { ShapeManipulationData } from '../editor/shapes/types';

type Box = {
  width: number;
  height: number;
};

interface UseCanvasRendererOptions {
  imageUrl: string | null;
  shape: FaviconShape;
  shapeManipulation: ShapeManipulationData | null;
  isShapeEditMode: boolean;
}

/**
 * Hook for rendering images on a canvas with responsive scaling and checkered background
 *
 * The canvas automatically scales images to fit the container width while respecting
 * a maximum height constraint. The display scale factor is calculated and returned
 * to help with coordinate transformations for overlay interactions.
 *
 */
export function useCanvasRenderer({
  imageUrl,
  shape,
  shapeManipulation,
  isShapeEditMode,
}: UseCanvasRendererOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canvasSize, setCanvasSize] = useState<Box>({
    width: EMPTY_CANVAS_SIZE,
    height: EMPTY_CANVAS_SIZE,
  });
  const [displayScale, setDisplayScale] = useState(1);
  const [imageSize, setImageSize] = useState<Box>({ width: 0, height: 0 });
  const [canvasMounted, setCanvasMounted] = useState(false);
  const applyShape = useShape();

  /**
   * Ref callback that tracks canvas mounting state
   * Triggers re-render when canvas element becomes available in the DOM
   */
  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (node) {
      setCanvasMounted(true);
    }
  }, []);

  /**
   * Calculates optimal scaling to fit an image within container constraints
   *
   * Ensures the image fits within both the container width and maximum height
   * while maintaining aspect ratio. Returns the scaled dimensions and scale factor.
   *
   */
  const scaleFitImage = useCallback((img: HTMLImageElement) => {
    const container = containerRef.current;
    let containerWidth = container ? container.clientWidth - CANVAS_PADDING : CONTAINER_MIN_WIDTH;

    if (containerWidth <= 0) {
      containerWidth = CONTAINER_MIN_WIDTH;
    }

    let scale = 1;
    if (img.naturalWidth > containerWidth) {
      scale = containerWidth / img.naturalWidth;
    }
    if (img.naturalHeight * scale > MAX_CANVAS_HEIGHT) {
      scale = MAX_CANVAS_HEIGHT / img.naturalHeight;
    }

    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    return {
      height,
      width,
      scale,
    };
  }, []);

  /**
   * Updates canvas dimensions, state, and renders the checkered background with optional image
   *
   * This function synchronizes all canvas-related state and performs the actual drawing.
   * It updates the canvas element dimensions, state variables, and renders the background
   * pattern. If an image is provided, it draws the image over the background.
   *
   */
  const updateUI = useCallback(
    (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      canvasBox: Box,
      imageBox: Box,
      scale: number,
      img: HTMLImageElement | null
    ) => {
      setImageSize({ ...imageBox });

      canvas.width = canvasBox.width;
      canvas.height = canvasBox.height;
      setCanvasSize({ ...canvasBox });

      setDisplayScale(scale);
      drawCheckeredBackground(ctx, { ...canvasBox });

      if (img) {
        ctx.drawImage(img, 0, 0, canvasBox.width, canvasBox.height);
      }
    },
    []
  );

  /**
   * Loads and renders an image onto the canvas with optional shape overlay
   *
   * Handles the complete image rendering pipeline:
   * 1. Applies shape overlay if not in edit mode
   * 2. Downloads/loads the image
   * 3. Calculates appropriate scaling
   * 4. Updates UI with the rendered result
   *
   */
  const renderImageOnCanvas = useCallback(
    async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageUrl: string) => {
      const displayImageUrl = !isShapeEditMode ? await applyShape(imageUrl, shape, shapeManipulation) : imageUrl;

      const img = await downloadImage(displayImageUrl);
      const { width, height, scale } = scaleFitImage(img);
      updateUI(
        canvas,
        ctx,
        { width, height },
        { width: img.naturalWidth, height: img.naturalHeight },
        scale,
        img
      );
    },
    [isShapeEditMode, applyShape, updateUI, scaleFitImage, shape, shapeManipulation]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderCanvas = async () => {
      if (!imageUrl) {
        return updateUI(
          canvas,
          ctx,
          { width: EMPTY_CANVAS_SIZE, height: EMPTY_CANVAS_SIZE },
          { width: 0, height: 0 },
          1,
          null
        );
      }

      setIsLoading(true);
      try {
        await renderImageOnCanvas(canvas, ctx, imageUrl);
      } catch (error) {
        console.error('Failed to render canvas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    renderCanvas();
  }, [imageUrl, canvasMounted, updateUI, renderImageOnCanvas]);

  const getBoundary = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return { x: 0, y: 0, width: EMPTY_CANVAS_SIZE, height: EMPTY_CANVAS_SIZE };
    }
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      x: canvasRect.left - containerRect.left,
      y: canvasRect.top - containerRect.top,
      width: canvas.width,
      height: canvas.height,
    };
  }, []);

  return {
    setCanvasRef: setCanvasRef,
    canvasElRef: canvasRef,
    containerRef,
    isLoading,
    canvasSize,
    displayScale,
    imageSize,
    getBoundary,
  };
}


/**
 * Draws a checkered pattern background on the canvas for transparency visualization
 *
 * Creates an alternating pattern of light and dark squares to provide a standard
 * background for viewing images with transparent regions. The pattern uses 8x8 pixel
 * squares with light gray (#ffffff) and medium gray (#cccccc) colors.
 */
function drawCheckeredBackground(ctx: CanvasRenderingContext2D, { width, height }: Box): void {
  const squareSize = CHECKED_SQUARE_SIZE;
  const lightColor = '#ffffff';
  const darkColor = '#cccccc';

  for (let y = 0; y < height; y += squareSize) {
    for (let x = 0; x < width; x += squareSize) {
      const isEvenRow = Math.floor(y / squareSize) % 2 === 0;
      const isEvenCol = Math.floor(x / squareSize) % 2 === 0;
      ctx.fillStyle = isEvenRow === isEvenCol ? lightColor : darkColor;
      ctx.fillRect(x, y, squareSize, squareSize);
    }
  }
}
