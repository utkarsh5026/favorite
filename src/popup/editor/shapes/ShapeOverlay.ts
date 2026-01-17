/**
 * ShapeOverlay - Interactive shape manipulation UI overlay
 *
 * Renders a draggable/resizable shape selection over the editor canvas
 * with 8 handles (4 corners + 4 edges) and SVG-based darkened mask outside the shape.
 * Uses normalized coordinates (0-1) for position and scale.
 */

import type { FaviconShape } from '@/types';
import { createSvgEl } from '@/utils';
import { BaseOverlay } from '../overlay';
import type { DisplayBoundingBox } from '../overlay';
import type { ShapeManipulationData } from './types';
import { DEFAULT_SHAPE_MANIPULATION } from './types';
import { constrainScale, constrainPosition, getShapeBoundingBox, getDistance } from './utils';

/** Manipulation data without shape (for internal state) */
type ManipulationWithoutShape = Omit<ShapeManipulationData, 'shape'>;

/**
 * Generates SVG path data for different shapes, centered at origin
 */
function getShapeSVGPath(shape: FaviconShape, size: number): string {
  const halfSize = size / 2;

  switch (shape) {
    case 'circle':
      return `M ${halfSize} 0 A ${halfSize} ${halfSize} 0 1 1 ${halfSize} ${size} A ${halfSize} ${halfSize} 0 1 1 ${halfSize} 0`;

    case 'rounded': {
      const r = size * 0.2; // 20% corner radius
      return `
        M ${r} 0
        L ${size - r} 0
        Q ${size} 0 ${size} ${r}
        L ${size} ${size - r}
        Q ${size} ${size} ${size - r} ${size}
        L ${r} ${size}
        Q 0 ${size} 0 ${size - r}
        L 0 ${r}
        Q 0 0 ${r} 0
        Z
      `;
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
      return `
        M ${12 * scale} ${21.35 * scale}
        L ${10.55 * scale} ${20.03 * scale}
        C ${5.4 * scale} ${15.36 * scale} ${2 * scale} ${12.28 * scale} ${2 * scale} ${8.5 * scale}
        C ${2 * scale} ${5.42 * scale} ${4.42 * scale} ${3 * scale} ${7.5 * scale} ${3 * scale}
        C ${9.24 * scale} ${3 * scale} ${10.91 * scale} ${3.81 * scale} ${12 * scale} ${5.09 * scale}
        C ${13.09 * scale} ${3.81 * scale} ${14.76 * scale} ${3 * scale} ${16.5 * scale} ${3 * scale}
        C ${19.58 * scale} ${3 * scale} ${22 * scale} ${5.42 * scale} ${22 * scale} ${8.5 * scale}
        C ${22 * scale} ${12.28 * scale} ${18.6 * scale} ${15.36 * scale} ${13.45 * scale} ${20.04 * scale}
        L ${12 * scale} ${21.35 * scale}
        Z
      `;
    }

    case 'square':
    default:
      return `M 0 0 L ${size} 0 L ${size} ${size} L 0 ${size} Z`;
  }
}

/**
 * Interactive shape manipulation overlay
 * Extends BaseOverlay with normalized coordinates and SVG mask
 */
export class ShapeOverlay extends BaseOverlay<ShapeManipulationData, ManipulationWithoutShape> {
  private manipulation: ManipulationWithoutShape = { ...DEFAULT_SHAPE_MANIPULATION };
  private manipulationStart: ManipulationWithoutShape = { ...DEFAULT_SHAPE_MANIPULATION };
  private shape: FaviconShape = 'circle';
  private initSelection: ShapeManipulationData | null = null;
  private svgElement: SVGSVGElement | null = null;
  private shapePath: SVGPathElement | null = null;

  /**
   * Initialize the shape overlay (backwards-compatible signature)
   */
  init(
    container: HTMLElement,
    imageWidth: number,
    imageHeight: number,
    displayScale: number,
    shape: FaviconShape,
    initSelection: ShapeManipulationData | null,
    onApply: (data: ShapeManipulationData) => void,
    onCancel: () => void
  ): void {
    this.shape = shape;
    this.initSelection = initSelection;
    this.initBase({ container, imageWidth, imageHeight, displayScale }, onApply, onCancel);
  }

  protected getClassPrefix(): string {
    return 'shape';
  }

  protected initializeSelection(): void {
    if (this.initSelection && this.initSelection.shape === this.shape) {
      this.manipulation = {
        centerX: this.initSelection.centerX,
        centerY: this.initSelection.centerY,
        scale: this.initSelection.scale,
      };
    } else {
      this.manipulation = { ...DEFAULT_SHAPE_MANIPULATION };
    }
  }

  protected createOverlayContent(): void {
    if (!this.overlayElement) return;

    this.svgElement = createSvgEl('svg', {
      class: 'shape-mask-svg',
      width: '100%',
      height: '100%',
    });

    const defs = createSvgEl('defs');
    const mask = createSvgEl('mask', { id: 'shapeMask' });

    const maskBg = createSvgEl('rect', { width: '100%', height: '100%', fill: 'white' });
    this.shapePath = createSvgEl('path', { fill: 'black' });

    mask.append(maskBg, this.shapePath);
    defs.appendChild(mask);
    this.svgElement.appendChild(defs);

    const darkOverlay = createSvgEl('rect', {
      width: '100%',
      height: '100%',
      fill: 'rgba(0, 0, 0, 0.6)',
      mask: 'url(#shapeMask)',
    });
    this.svgElement.appendChild(darkOverlay);

    this.overlayElement.appendChild(this.svgElement);
  }

  protected cleanupOverlayContent(): void {
    this.svgElement = null;
    this.shapePath = null;
  }

  protected getSelectionStart(): ManipulationWithoutShape {
    return { ...this.manipulation };
  }

  protected setSelectionStart(start: ManipulationWithoutShape): void {
    this.manipulationStart = start;
  }

  protected handleDragMove(
    currentX: number,
    currentY: number,
    deltaX: number,
    deltaY: number
  ): void {
    const normalize = (value: number, dimension: number) => {
      return value / (dimension * this.displayScale);
    };

    if (this.dragType === 'move') {
      const dx = normalize(deltaX, this.imageWidth);
      const normalizedDeltaY = normalize(deltaY, this.imageHeight);

      this.manipulation.centerX = constrainPosition(
        this.manipulationStart.centerX + dx,
        this.manipulation.scale
      );
      this.manipulation.centerY = constrainPosition(
        this.manipulationStart.centerY + normalizedDeltaY,
        this.manipulation.scale
      );
    } else {
      // Resize: calculate scale from distance to center
      const bbox = getShapeBoundingBox(
        this.manipulationStart.centerX,
        this.manipulationStart.centerY,
        this.manipulationStart.scale,
        this.imageWidth,
        this.imageHeight,
        this.displayScale
      );

      const centerDisplayX = bbox.left + bbox.width / 2;
      const centerDisplayY = bbox.top + bbox.height / 2;

      const startDist = getDistance(
        this.dragStart.x,
        this.dragStart.y,
        centerDisplayX,
        centerDisplayY
      );
      const currentDist = getDistance(currentX, currentY, centerDisplayX, centerDisplayY);

      if (startDist > 0) {
        const scaleDelta = currentDist / startDist;
        this.manipulation.scale = constrainScale(this.manipulationStart.scale * scaleDelta);
      }
    }
  }

  protected getSelectionBoundingBox(): DisplayBoundingBox {
    return getShapeBoundingBox(
      this.manipulation.centerX,
      this.manipulation.centerY,
      this.manipulation.scale,
      this.imageWidth,
      this.imageHeight,
      this.displayScale
    );
  }

  protected renderOverlayContent(bbox: DisplayBoundingBox): void {
    if (!this.shapePath) return;
    const shapeSVGPath = getShapeSVGPath(this.shape, bbox.width);
    this.shapePath.setAttribute('d', shapeSVGPath);
    this.shapePath.setAttribute('transform', `translate(${bbox.left}, ${bbox.top})`);
  }

  protected getApplyData(): ShapeManipulationData {
    return {
      shape: this.shape,
      centerX: this.manipulation.centerX,
      centerY: this.manipulation.centerY,
      scale: this.manipulation.scale,
    };
  }
}
