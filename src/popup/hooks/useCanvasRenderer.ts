import { useRef, useState, useCallback, useEffect } from 'react';
import { downloadImage } from '@/utils';
import { applyShapeToImage } from '../editor/transforms';
import type { FaviconShape } from '@/types';
import type { ShapeManipulationData } from '../editor/shapes/types';

type Box = {
  width: number;
  height: number;
};

const CHECKED_SQUARE_SIZE = 8;
const MAX_CANVAS_HEIGHT = 250;
const CANVAS_PADDING = 2;
const CONTAINER_MIN_WIDTH = 300;

interface UseCanvasRendererOptions {
  imageUrl: string | null;
  shape: FaviconShape;
  shapeManipulation: ShapeManipulationData | null;
  isShapeEditMode: boolean;
}
/**
 * Hook for rendering the editor canvas with checkered background and image
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
  const [canvasSize, setCanvasSize] = useState<Box>({ width: 200, height: 200 });
  const [displayScale, setDisplayScale] = useState(1);
  const [imageSize, setImageSize] = useState<Box>({ width: 0, height: 0 });
  const [canvasMounted, setCanvasMounted] = useState(false);

  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    if (node) {
      setCanvasMounted(true);
    }
  }, []);

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

  const renderImageOnCanvas = useCallback(
    async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageUrl: string) => {
      const displayImageUrl = !isShapeEditMode
        ? await applyShapeToImage(imageUrl, shape, shapeManipulation)
        : imageUrl;

      const img = await downloadImage(displayImageUrl);
      const { width, height, scale } = scaleFitImage(img);
      updateUI(
        canvas,
        ctx,
        { width, height },
        { width, height },
        scale,
        img
      );
    },
    [isShapeEditMode, shape, shapeManipulation, scaleFitImage, updateUI]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderCanvas = async () => {
      if (!imageUrl) {
        console.log('Loading empty background');
        return updateUI(
          canvas,
          ctx,
          { width: 200, height: 200 },
          { width: 0, height: 0 },
          1,
          null
        );
      }

      setIsLoading(true);
      console.log('Will show the image', imageUrl);

      try {
        await renderImageOnCanvas(canvas, ctx, imageUrl);
      } catch (error) {
        console.error('Failed to render canvas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    renderCanvas();
  }, [imageUrl, canvasMounted, scaleFitImage, updateUI, renderImageOnCanvas]);

  return {
    canvasRef: setCanvasRef,
    containerRef,
    isLoading,
    canvasSize,
    displayScale,
    imageSize,
  };
}

/**
 * Draw a checkered pattern background on the canvas
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
