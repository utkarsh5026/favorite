/**
 * CropOverlay - Interactive crop selection UI overlay
 *
 * Renders a draggable/resizable crop selection box over the editor canvas
 * with 8 handles (4 corners + 4 edges) and darkened overlay outside selection.
 */

import { createEl } from '@/utils';
import { BaseOverlay } from '../overlay';
import type { DisplayBoundingBox, Point } from '../overlay';
import type { CropData, CropConfig, BoundaryRect } from './types';
import { DEFAULT_CROP_CONFIG } from './types';

/**
 * Interactive crop selection overlay
 * Extends BaseOverlay with pixel-based coordinates and CSS mask divs
 */
export class CropOverlay extends BaseOverlay<CropData, CropData> {
  private crop: CropData = { x: 0, y: 0, width: 100, height: 100 };
  private cropStart: CropData = { x: 0, y: 0, width: 0, height: 0 };
  private config: CropConfig = { ...DEFAULT_CROP_CONFIG };
  private boundary: BoundaryRect = { x: 0, y: 0, width: 0, height: 0 };

  // References to mask elements
  private maskTop: HTMLElement | null = null;
  private maskBottom: HTMLElement | null = null;
  private maskLeft: HTMLElement | null = null;
  private maskRight: HTMLElement | null = null;

  /**
   * Initialize the crop overlay (backwards-compatible signature)
   */
  init(
    container: HTMLElement,
    imageWidth: number,
    imageHeight: number,
    displayScale: number,
    boundary: BoundaryRect,
    onApply: (crop: CropData) => void,
    onCancel: () => void
  ): void {
    this.boundary = boundary;
    this.initBase({ container, imageWidth, imageHeight, displayScale }, onApply, onCancel);
  }

  protected getClassPrefix(): string {
    return 'crop';
  }

  /**
   * Initialize crop rectangle with default values (80% of image with 10% margin).
   *
   * Creates initial crop rectangle centered in the image:
   * - 10% margin on all sides
   * - 80% of image width and height
   * - Values in image pixel coordinates
   */
  protected initializeSelection(): void {
    const margin = 0.1;
    this.crop = {
      x: this.imageWidth * margin,
      y: this.imageHeight * margin,
      width: this.imageWidth * (1 - 2 * margin),
      height: this.imageHeight * (1 - 2 * margin),
    };
  }

  /**
   * Create the mask divs that darken areas outside the crop selection.
   *
   * Creates 4 mask elements (top, bottom, left, right) that cover the
   * container except for the crop selection area. These are positioned
   * and sized in renderOverlayContent() on each render.
   */
  protected createOverlayContent(): void {
    if (!this.overlayElement) return;

    const mask = (dir: string) => createEl('div', `crop-mask  crop-mask-${dir}`);

    this.maskTop = mask('top');
    this.maskBottom = mask('bottom');
    this.maskLeft = mask('left');
    this.maskRight = mask('right');

    this.overlayElement.append(this.maskTop, this.maskBottom, this.maskLeft, this.maskRight);
  }

  /**
   * Create grid lines inside the selection box for rule-of-thirds composition.
   *
   * Creates 4 grid line elements:
   * - 2 horizontal lines (h1, h2) at 1/3 and 2/3 height
   * - 2 vertical lines (v1, v2) at 1/3 and 2/3 width
   *
   * Grid lines are positioned via CSS relative to the selection box.
   */
  protected createSelectionContent(): void {
    if (!this.selectionElement) return;
    const createGrid = (dir: string) => createEl('div', `crop-grid crop-grid-${dir}`);
    const grid = ['h1', 'h2', 'v1', 'v2'].map(createGrid);
    this.selectionElement.append(...grid);
  }

  protected getMousePosition(e: MouseEvent): Point {
    return {
      x: e.clientX - this.boundary.x,
      y: e.clientY - this.boundary.y,
    };
  }

  protected getSelectionStart(): CropData {
    return { ...this.crop };
  }

  protected setSelectionStart(start: CropData): void {
    this.cropStart = start;
  }

  /**
   * Handle mouse movement during drag operations.
   *
   * Calculates new crop values based on drag type and delta:
   * - 'move': Translate the entire crop rectangle
   * - 'n', 's', 'e', 'w': Resize by dragging single edge
   * - 'nw', 'ne', 'sw', 'se': Resize by dragging corner
   *
   * Delta values are scaled from display coordinates to image coordinates
   * before being applied to the crop rectangle.
   *
   * After calculating new crop values, constrainCrop() ensures the crop
   * stays within image bounds and respects minimum size.
   *
   * @param _currentX - Current mouse X (unused, we use delta)
   * @param _currentY - Current mouse Y (unused, we use delta)
   * @param deltaX - Horizontal distance from drag start in display pixels
   * @param deltaY - Vertical distance from drag start in display pixels
   */
  protected handleDragMove(
    _currentX: number,
    _currentY: number,
    deltaX: number,
    deltaY: number
  ): void {
    const dx = deltaX / this.displayScale;
    const dy = deltaY / this.displayScale;
    const { x, y, width, height } = this.crop;

    let updates: Partial<CropData> = {};
    const type = this.dragType ?? '';

    if (type === 'move') {
      Object.assign(this.crop, {
        ...this.crop,
        x: x + dx,
        y: y + dy,
      });
      this.constrainCrop();
      return;
    }

    if (type.includes('n')) {
      updates = { ...updates, y: y + dy, height: height - dy };
    }
    if (type.includes('s')) {
      updates = { ...updates, height: height + dy };
    }
    if (type.includes('w')) {
      updates = { ...updates, x: x + dx, width: width - dx };
    }
    if (type.includes('e')) {
      updates = { ...updates, width: width + dx };
    }

    Object.assign(this.crop, updates);
    this.constrainCrop();
  }

  /**
   * Constrain crop rectangle to stay within image bounds and respect minimum size.
   *
   * Applies constraints in image pixel coordinates:
   * 1. Enforce minimum width/height (from config.minSize)
   * 2. Clamp position to stay within [0, imageSize - cropSize]
   * 3. Adjust size if position would go negative
   *
   * This method is called after every drag operation to ensure the crop
   * remains valid regardless of how aggressively the user drags.
   */
  private constrainCrop(): void {
    const constrain = (pos: number, size: number, max: number) => {
      size = Math.max(size, this.config.minSize);
      pos = Math.max(0, Math.min(pos, max - size));

      if (pos < 0) {
        size += pos;
        pos = 0;
      }

      return { pos, size };
    };

    const { pos: x, size: width } = constrain(this.crop.x, this.crop.width, this.imageWidth);
    const { pos: y, size: height } = constrain(this.crop.y, this.crop.height, this.imageHeight);
    Object.assign(this.crop, { x, y, height, width });
  }

  /**
   * Get the bounding box for the selection element in display coordinates.
   *
   * Converts crop data from image space to display space:
   * 1. Scale crop dimensions by displayScale
   * 2. Offset by boundary position
   *
   * @returns DisplayBoundingBox with absolute position in container
   */
  protected getSelectionBoundingBox(): DisplayBoundingBox {
    return {
      left: this.boundary.x + this.crop.x * this.displayScale,
      top: this.boundary.y + this.crop.y * this.displayScale,
      width: this.crop.width * this.displayScale,
      height: this.crop.height * this.displayScale,
    };
  }
  /**
   * Render the mask divs to darken areas outside the crop selection.
   *
   * Positions the 4 mask elements to cover the entire container except
   * for the crop selection area:
   * - Top mask: from container top to selection top
   * - Bottom mask: from selection bottom to container bottom
   * - Left mask: from container left to selection left (selection height)
   * - Right mask: from selection right to container right (selection height)
   *
   * @param bbox - Current selection bounding box in display coordinates
   */
  protected renderOverlayContent({
    top: t,
    left: l,
    width: w,
    height: h,
  }: DisplayBoundingBox): void {
    if (!this.container) return;

    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    const setMaskStyles = (
      mask: HTMLElement | null,
      left: number,
      top: number,
      width: number,
      height: number
    ) => {
      if (!mask) return;
      Object.assign(mask.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
    };

    setMaskStyles(this.maskTop, 0, 0, containerWidth, t);
    setMaskStyles(this.maskBottom, 0, t + h, containerWidth, containerHeight - t - h);
    setMaskStyles(this.maskLeft, 0, t, l, h);
    setMaskStyles(this.maskRight, l + w, t, containerWidth - l - w, h);
  }

  protected getApplyData(): CropData {
    return {
      x: Math.round(this.crop.x),
      y: Math.round(this.crop.y),
      width: Math.round(this.crop.width),
      height: Math.round(this.crop.height),
    };
  }
}
