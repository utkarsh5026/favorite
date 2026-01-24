import type { FaviconShape } from '@/types';
import { useCallback } from 'react';

export function useShapePath() {
  /**
   * Generates SVG path data for different shapes, centered at origin
   */
  const getShapeSVGPath = useCallback((shape: FaviconShape, size: number) => {
    const halfSize = size / 2;

    switch (shape) {
      case 'circle':
        return `M ${halfSize} 0 A ${halfSize} ${halfSize} 0 1 1 ${halfSize} ${size} A ${halfSize} ${halfSize} 0 1 1 ${halfSize} 0`;

      case 'rounded': {
        const r = size * 0.2;
        return `M ${r} 0 L ${size - r} 0 Q ${size} 0 ${size} ${r} L ${size} ${size - r} Q ${size} ${size} ${size - r} ${size} L ${r} ${size} Q 0 ${size} 0 ${size - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
      }

      case 'hexagon': {
        const scale = size / 24;
        const points = [
          [12, 2],
          [21, 7],
          [21, 17],
          [12, 22],
          [3, 17],
          [3, 7],
        ];
        return (
          points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0] * scale} ${p[1] * scale}`).join(' ') +
          ' Z'
        );
      }

      case 'heart': {
        const scale = size / 24;
        return `M ${12 * scale} ${21.35 * scale} L ${10.55 * scale} ${20.03 * scale} C ${5.4 * scale} ${15.36 * scale} ${2 * scale} ${12.28 * scale} ${2 * scale} ${8.5 * scale} C ${2 * scale} ${5.42 * scale} ${4.42 * scale} ${3 * scale} ${7.5 * scale} ${3 * scale} C ${9.24 * scale} ${3 * scale} ${10.91 * scale} ${3.81 * scale} ${12 * scale} ${5.09 * scale} C ${13.09 * scale} ${3.81 * scale} ${14.76 * scale} ${3 * scale} ${16.5 * scale} ${3 * scale} C ${19.58 * scale} ${3 * scale} ${22 * scale} ${5.42 * scale} ${22 * scale} ${8.5 * scale} C ${22 * scale} ${12.28 * scale} ${18.6 * scale} ${15.36 * scale} ${13.45 * scale} ${20.04 * scale} L ${12 * scale} ${21.35 * scale} Z`;
      }

      case 'square':
      default:
        return `M 0 0 L ${size} 0 L ${size} ${size} L 0 ${size} Z`;
    }
  }, []);

  return { getShapeSVGPath };
}
