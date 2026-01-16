/**
 * CropOverlay - Interactive crop selection UI overlay
 *
 * Renders a draggable/resizable crop selection box over the editor canvas
 * with 8 handles (4 corners + 4 edges) and darkened overlay outside selection.
 */

import type { CropData, CropConfig, HandlePosition, DragType, Point, BoundaryRect } from './types';
import { DEFAULT_CROP_CONFIG } from './types';

/**
 * Manages the interactive crop overlay UI
 */
export class CropOverlay {
  private container: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private selectionElement: HTMLElement | null = null;
  private handles: Map<HandlePosition, HTMLElement> = new Map();

  private crop: CropData = { x: 0, y: 0, width: 100, height: 100 };
  private config: CropConfig = { ...DEFAULT_CROP_CONFIG };

  // Drag state
  private isDragging = false;
  private dragType: DragType = null;
  private dragStart: Point = { x: 0, y: 0 };
  private cropStart: CropData = { x: 0, y: 0, width: 0, height: 0 };

  // Image dimensions (for constraining)
  private imageWidth = 0;
  private imageHeight = 0;

  // Display scale (display size / actual image size)
  private displayScale = 1;

  // Boundary rect - where the image is displayed in the container
  private boundary: BoundaryRect = { x: 0, y: 0, width: 0, height: 0 };

  // Callbacks
  private onApply: ((crop: CropData) => void) | null = null;
  private onCancel: (() => void) | null = null;

  // Bound event handlers (stored so we can remove them)
  private boundHandleMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundHandleMouseUp: (() => void) | null = null;
  private boundHandleKeyDown: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Initialize the crop overlay
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
    this.container = container;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    this.displayScale = displayScale;
    this.boundary = boundary;
    this.onApply = onApply;
    this.onCancel = onCancel;

    const margin = 0.1;
    this.crop = {
      x: imageWidth * margin,
      y: imageHeight * margin,
      width: imageWidth * (1 - 2 * margin),
      height: imageHeight * (1 - 2 * margin),
    };

    this.createOverlay();
    this.bindEvents();
    this.render();
  }

  /**
   * Create the overlay DOM elements
   */
  private createOverlay(): void {
    if (!this.container) return;

    const createEl = (className: string) => {
      const el = document.createElement('div');
      el.className = className;
      return el;
    };

    this.overlayElement = createEl('crop-overlay');
    const maskTop = createEl('crop-mask crop-mask-top');
    const maskBottom = createEl('crop-mask crop-mask-bottom');
    const maskLeft = createEl('crop-mask crop-mask-left');
    const maskRight = createEl('crop-mask crop-mask-right');

    this.overlayElement.append(maskTop, maskBottom, maskLeft, maskRight);
    this.selectionElement = createEl('crop-selection');

    const handlePositions: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const pos of handlePositions) {
      const handle = createEl(`crop-handle crop-handle-${pos}`);
      handle.dataset.position = pos;
      this.handles.set(pos, handle);
      this.selectionElement.appendChild(handle);
    }

    const gridH1 = createEl('crop-grid crop-grid-h1');
    const gridH2 = createEl('crop-grid crop-grid-h2');
    const gridV1 = createEl('crop-grid crop-grid-v1');
    const gridV2 = createEl('crop-grid crop-grid-v2');
    this.selectionElement.append(gridH1, gridH2, gridV1, gridV2);

    this.overlayElement.appendChild(this.selectionElement);
    const actionsContainer = createEl('crop-actions');

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'crop-action-btn crop-cancel-btn';
    cancelBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    `;
    cancelBtn.title = 'Cancel crop';
    cancelBtn.addEventListener('click', () => this.cancel());

    const applyBtn = document.createElement('button');
    applyBtn.className = 'crop-action-btn crop-apply-btn';
    applyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    `;
    applyBtn.title = 'Apply crop';
    applyBtn.addEventListener('click', () => this.apply());

    actionsContainer.append(cancelBtn, applyBtn);
    this.selectionElement.appendChild(actionsContainer);

    this.container.appendChild(this.overlayElement);
  }

  /**
   * Bind mouse/touch events
   */
  private bindEvents(): void {
    if (!this.overlayElement || !this.selectionElement) return;

    this.selectionElement.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).classList.contains('crop-handle')) return;
      this.startDrag(e, 'move');
    });

    this.handles.forEach((handle, pos) => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startDrag(e, pos);
      });
    });

    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('mouseup', this.boundHandleMouseUp);
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  /**
   * Start a drag operation
   */
  private startDrag(e: MouseEvent, type: DragType): void {
    e.preventDefault();
    this.isDragging = true;
    this.dragType = type;
    // Account for boundary offset when starting drag
    this.dragStart = {
      x: e.clientX - this.boundary.x,
      y: e.clientY - this.boundary.y
    };
    this.cropStart = { ...this.crop };
    this.overlayElement?.classList.add('dragging');
  }

  private updateCrop(updates: Partial<CropData>): void {
    this.crop = {
      ...this.crop,
      ...updates,
    };
  }

  /**
   * Handle mouse move during drag
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.dragType) return;

    // Account for boundary offset in mouse position
    const currentX = e.clientX - this.boundary.x;
    const currentY = e.clientY - this.boundary.y;
    const deltaX = (currentX - this.dragStart.x) / this.displayScale;
    const deltaY = (currentY - this.dragStart.y) / this.displayScale;

    switch (this.dragType) {
      case 'move':
        this.updateCrop({
          x: this.cropStart.x + deltaX,
          y: this.cropStart.y + deltaY,
        });
        break;

      case 'n':
        this.updateCrop({
          y: this.cropStart.y + deltaY,
          height: this.cropStart.height - deltaY,
        });
        break;

      case 's':
        this.updateCrop({
          height: this.cropStart.height + deltaY,
        });
        break;

      case 'e': // Right edge
        this.updateCrop({
          width: this.cropStart.width + deltaX,
        });
        break;

      case 'w': // Left edge
        this.updateCrop({
          x: this.cropStart.x + deltaX,
          width: this.cropStart.width - deltaX,
        });
        break;

      case 'nw': // Top-left corner
        this.updateCrop({
          x: this.cropStart.x + deltaX,
          y: this.cropStart.y + deltaY,
          width: this.cropStart.width - deltaX,
          height: this.cropStart.height - deltaY,
        });
        break;

      case 'ne': // Top-right corner
        this.updateCrop({
          y: this.cropStart.y + deltaY,
          width: this.cropStart.width + deltaX,
          height: this.cropStart.height - deltaY,
        });
        break;

      case 'sw': // Bottom-left corner
        this.updateCrop({
          x: this.cropStart.x + deltaX,
          width: this.cropStart.width - deltaX,
          height: this.cropStart.height + deltaY,
        });
        break;

      case 'se': // Bottom-right corner
        this.updateCrop({
          width: this.cropStart.width + deltaX,
          height: this.cropStart.height + deltaY,
        });
        break;
    }

    this.constrainCrop();
    this.render();
  }

  /**
   * Handle mouse up (end drag)
   */
  private handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragType = null;
      this.overlayElement?.classList.remove('dragging');
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.overlayElement) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.cancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.apply();
    }
  }

  /**
   * Constrain crop to image bounds and minimum size
   */
  private constrainCrop(): void {
    const { minSize } = this.config;
    this.updateCrop({
      width: Math.max(this.crop.width, minSize),
      height: Math.max(this.crop.height, minSize),
      x: Math.max(0, this.crop.x),
      y: Math.max(0, this.crop.y),
    });

    if (this.crop.x + this.crop.width > this.imageWidth) {
      this.crop.x = this.imageWidth - this.crop.width;
    }
    if (this.crop.y + this.crop.height > this.imageHeight) {
      this.crop.y = this.imageHeight - this.crop.height;
    }

    if (this.crop.x < 0) {
      this.crop.width += this.crop.x;
      this.crop.x = 0;
    }
    if (this.crop.y < 0) {
      this.crop.height += this.crop.y;
      this.crop.y = 0;
    }
  }

  /**
   * Render the overlay with current crop values
   */
  private render(): void {
    if (!this.overlayElement || !this.selectionElement || !this.container) return;

    const displayCrop = {
      x: this.crop.x * this.displayScale,
      y: this.crop.y * this.displayScale,
      width: this.crop.width * this.displayScale,
      height: this.crop.height * this.displayScale,
    };

    // Position relative to boundary (where the image is displayed)
    const absoluteX = this.boundary.x + displayCrop.x;
    const absoluteY = this.boundary.y + displayCrop.y;

    // Use container dimensions to extend masks to full canvas
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    // Update selection position (offset by boundary position)
    this.selectionElement.style.left = `${absoluteX}px`;
    this.selectionElement.style.top = `${absoluteY}px`;
    this.selectionElement.style.width = `${displayCrop.width}px`;
    this.selectionElement.style.height = `${displayCrop.height}px`;

    // Update dark masks to cover entire container
    const maskTop = this.overlayElement.querySelector('.crop-mask-top') as HTMLElement;
    const maskBottom = this.overlayElement.querySelector('.crop-mask-bottom') as HTMLElement;
    const maskLeft = this.overlayElement.querySelector('.crop-mask-left') as HTMLElement;
    const maskRight = this.overlayElement.querySelector('.crop-mask-right') as HTMLElement;

    if (maskTop) {
      maskTop.style.left = '0';
      maskTop.style.top = '0';
      maskTop.style.width = `${containerWidth}px`;
      maskTop.style.height = `${absoluteY}px`;
    }

    if (maskBottom) {
      maskBottom.style.left = '0';
      maskBottom.style.top = `${absoluteY + displayCrop.height}px`;
      maskBottom.style.width = `${containerWidth}px`;
      maskBottom.style.height = `${containerHeight - absoluteY - displayCrop.height}px`;
    }

    if (maskLeft) {
      maskLeft.style.left = '0';
      maskLeft.style.top = `${absoluteY}px`;
      maskLeft.style.width = `${absoluteX}px`;
      maskLeft.style.height = `${displayCrop.height}px`;
    }

    if (maskRight) {
      maskRight.style.left = `${absoluteX + displayCrop.width}px`;
      maskRight.style.top = `${absoluteY}px`;
      maskRight.style.width = `${containerWidth - absoluteX - displayCrop.width}px`;
      maskRight.style.height = `${displayCrop.height}px`;
    }
  }

  /**
   * Apply the crop and call the callback
   */
  private apply(): void {
    if (this.onApply) {
      this.onApply({
        x: Math.round(this.crop.x),
        y: Math.round(this.crop.y),
        width: Math.round(this.crop.width),
        height: Math.round(this.crop.height),
      });
    }
    this.destroy();
  }

  /**
   * Cancel the crop operation
   */
  private cancel(): void {
    if (this.onCancel) {
      this.onCancel();
    }
    this.destroy();
  }

  /**
   * Clean up and remove the overlay
   */
  destroy(): void {
    if (this.boundHandleMouseMove) {
      document.removeEventListener('mousemove', this.boundHandleMouseMove);
    }
    if (this.boundHandleMouseUp) {
      document.removeEventListener('mouseup', this.boundHandleMouseUp);
    }
    if (this.boundHandleKeyDown) {
      document.removeEventListener('keydown', this.boundHandleKeyDown);
    }

    if (this.overlayElement && this.container) {
      this.container.removeChild(this.overlayElement);
    }

    this.overlayElement = null;
    this.selectionElement = null;
    this.handles.clear();
    this.container = null;
    this.onApply = null;
    this.onCancel = null;
    this.boundHandleMouseMove = null;
    this.boundHandleMouseUp = null;
    this.boundHandleKeyDown = null;
  }
}
