import { useCallback } from 'react';

export function useCanvas() {
  const getCanvasInfo = useCallback(() => {
    const container = document.getElementById('editorCanvasContainer');
    const canvas = document.getElementById('editorCanvas') as HTMLCanvasElement;

    if (!container || !canvas) {
      return {
        displayScale: 1,
        imageWidth: 200,
        imageHeight: 200,
        boundary: { x: 0, y: 0, width: 200, height: 200 },
      };
    }

    const displayScale = parseFloat(container.dataset.displayScale || '1');
    const imageWidth = parseInt(container.dataset.imageWidth || '200', 10);
    const imageHeight = parseInt(container.dataset.imageHeight || '200', 10);

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      displayScale,
      imageWidth,
      imageHeight,
      boundary: {
        x: canvasRect.left - containerRect.left,
        y: canvasRect.top - containerRect.top,
        width: canvas.width,
        height: canvas.height,
      },
    };
  }, []);

  return getCanvasInfo;
}
