/**
 * BaseOverlay - Abstract base class for interactive overlay UIs
 *
 * Uses Template Method Pattern where the base class defines the algorithm skeleton
 * (event handling, drag operations, lifecycle) and derived classes provide
 * specialized implementations for overlay-specific behavior.
 *
 * @typeParam TData - The data type returned on apply (e.g., CropData, ShapeManipulationData)
 * @typeParam TStart - The drag start state type (defaults to TData)
 */

import type { HandlePosition, DragType, Point, DisplayBoundingBox } from './types';
import { HANDLE_POSITIONS, HANDLE_CURSORS, ACTION_BUTTON_ICONS } from './types';
import { createEl } from '@/utils';

/**
 * Base configuration for overlay initialization
 */
export interface BaseOverlayConfig {
  container: HTMLElement;
  imageWidth: number;
  imageHeight: number;
  displayScale: number;
}

/**
 * Abstract base class for interactive overlay UIs (crop, shape, etc.)
 *
 * Implements the Template Method pattern to provide a consistent framework
 * for overlay implementations while allowing customization of specific behaviors.
 *
 * @typeParam TData - Type of data returned when user applies the overlay
 * @typeParam TStart - Type of state captured when drag begins (defaults to TData)
 */
export abstract class BaseOverlay<TData, TStart = TData> {
  // ============================================================
  // PROTECTED PROPERTIES - Available to subclasses
  // ============================================================

  /** Container element for the overlay */
  protected container: HTMLElement | null = null;

  /** Main overlay element */
  protected overlayElement: HTMLElement | null = null;

  /** Selection box element (draggable area) */
  protected selectionElement: HTMLElement | null = null;

  /** Map of handle position to handle elements */
  protected handles: Map<HandlePosition, HTMLElement> = new Map();

  /** Image dimensions in actual pixels */
  protected imageWidth = 0;
  protected imageHeight = 0;

  /** Display scale (displaySize / imageSize) */
  protected displayScale = 1;

  // Drag state
  protected isDragging = false;
  protected dragType: DragType = null;
  protected dragStart: Point = { x: 0, y: 0 };

  private onApply: ((data: TData) => void) | null = null;
  private onCancel: (() => void) | null = null;

  private boundHandleMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundHandleMouseUp: (() => void) | null = null;
  private boundHandleKeyDown: ((e: KeyboardEvent) => void) | null = null;

  /**
   * Get the CSS class prefix for this overlay type.
   * Used for: overlay element class, selection class, handle classes, action classes.
   * Example: 'crop' -> 'crop-overlay', 'crop-selection', 'crop-handle-nw'
   */
  protected abstract getClassPrefix(): string;

  /**
   * Create the overlay-specific DOM structure.
   * Called after base overlay element is created but before selection element.
   * Should add mask elements (CSS divs or SVG) to overlayElement.
   *
   * @remarks
   * This is where subclasses set up the visual darkening effect outside
   * the selection area. The selection box is created separately by the base class.
   */
  protected abstract createOverlayContent(): void;

  /**
   * Get a snapshot of the current manipulation state for drag operations.
   *
   * Called when a drag operation begins (mousedown on selection or handle).
   * The returned state is stored and used as the base for calculating new
   * values during the drag (in handleDragMove).
   *
   * Should return a copy of the selection data to prevent mutation.
   *
   * @returns Snapshot of current selection state
   */
  protected abstract initializeSelection(): void;

  /**
   * Get the starting state for drag operations.
   * Called when drag begins to snapshot current selection.
   */
  protected abstract getSelectionStart(): TStart;

  /**
   * Set the manipulation start state.
   * Called when drag begins.
   */
  protected abstract setSelectionStart(start: TStart): void;

  /**
   * Handle mouse move during drag operation.
   * Calculate new manipulation values based on drag delta.
   * @param currentX - Current mouse X in container coordinates
   * @param currentY - Current mouse Y in container coordinates
   * @param deltaX - Delta from drag start X
   * @param deltaY - Delta from drag start Y
   */
  protected abstract handleDragMove(
    currentX: number,
    currentY: number,
    deltaX: number,
    deltaY: number
  ): void;

  /**
   * Get the current display bounding box for the selection.
   * Used to position the selection element and handles.
   */
  protected abstract getSelectionBoundingBox(): DisplayBoundingBox;

  /**
   * Render overlay-specific elements (masks, paths, etc.).
   * Called after selection box position is updated.
   * @param bbox - Current bounding box of the selection
   */
  protected abstract renderOverlayContent(bbox: DisplayBoundingBox): void;

  /**
   * Get the final data to return on apply.
   */
  protected abstract getApplyData(): TData;

  // ============================================================
  // OPTIONAL OVERRIDES - Subclasses may override
  // ============================================================

  /**
   * Create additional content inside the selection box.
   * Default implementation does nothing.
   * Override to add grid lines, etc.
   */
  protected createSelectionContent(): void {
    // Default: no additional content
  }

  /**
   * Additional cleanup for subclass-specific elements.
   * Default implementation does nothing.
   */
  protected cleanupOverlayContent(): void {
    // Default: no additional cleanup
  }

  /**
   * Get the mouse position relative to the overlay coordinate space.
   * Override for custom coordinate handling (e.g., boundary offsets).
   */
  protected getMousePosition(e: MouseEvent): Point {
    const rect = this.container?.getBoundingClientRect();
    return {
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0),
    };
  }

  /**
   * Initialize the overlay with configuration and callbacks.
   * Subclasses should set their specific config before calling this.
   */
  protected initBase(
    config: BaseOverlayConfig,
    onApply: (data: TData) => void,
    onCancel: () => void
  ): void {
    this.container = config.container;
    this.imageWidth = config.imageWidth;
    this.imageHeight = config.imageHeight;
    this.displayScale = config.displayScale;
    this.onApply = onApply;
    this.onCancel = onCancel;

    this.initializeSelection();
    this.createOverlay();
    this.bindEvents();
    this.render();
  }

  /**
   * Clean up and remove the overlay.
   */
  destroy(): void {
    const remove = (name: string, func: ((e: any) => void) | null) => {
      if (func) {
        document.removeEventListener(name, func);
      }
    };

    remove('mousemove', this.boundHandleMouseMove);
    remove('mouseup', this.boundHandleMouseUp);
    remove('keydown', this.boundHandleKeyDown);

    this.cleanupOverlayContent();

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

  /**
   * Create the overlay DOM structure.
   */
  private createOverlay(): void {
    if (!this.container) return;

    const prefix = this.getClassPrefix();

    this.overlayElement = createEl('div', `${prefix}-overlay`);
    this.createOverlayContent();
    this.selectionElement = createEl('div', `${prefix}-selection`);

    for (const pos of HANDLE_POSITIONS) {
      const el = createEl('div', `${prefix}-handle ${prefix}-handle-${pos}`, {
        dataset: { position: pos },
        style: { cursor: HANDLE_CURSORS[pos] },
      });
      this.handles.set(pos, el);
      this.selectionElement.appendChild(el);
    }

    this.createSelectionContent();
    this.overlayElement.appendChild(this.selectionElement);
    this.createActionButtons();
    this.container.appendChild(this.overlayElement);
  }

  /**
   * Create apply/cancel action buttons.
   */
  private createActionButtons(): void {
    if (!this.selectionElement) return;

    const prefix = this.getClassPrefix();
    const actionsContainer = createEl('div', `${prefix}-actions`);

    const button = (title: string, btnType: string, onclick: () => void) => {
      const btn = createEl('button', `${prefix}-action-btn ${prefix}-${btnType}-btn`, {
        innerHTML: btnType === 'cancel' ? ACTION_BUTTON_ICONS.cancel : ACTION_BUTTON_ICONS.apply,
        title,
      });
      btn.addEventListener('click', onclick);
      return btn;
    };

    const cancelBtn = button('Cancel (Esc)', 'cancel', () => this.cancel());
    const applyBtn = button('Apply (Enter)', 'apply', () => this.apply());

    actionsContainer.append(cancelBtn, applyBtn);
    this.selectionElement.appendChild(actionsContainer);
  }

  /**
   * Bind mouse/keyboard events.
   */
  private bindEvents(): void {
    if (!this.overlayElement || !this.selectionElement) return;

    const prefix = this.getClassPrefix();

    this.selectionElement.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains(`${prefix}-handle`)) return;
      if (target.classList.contains(`${prefix}-action-btn`)) return;
      if (target.closest(`.${prefix}-actions`)) return;
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
   * Start a drag operation.
   */
  private startDrag(e: MouseEvent, type: DragType): void {
    e.preventDefault();
    this.isDragging = true;
    this.dragType = type;
    this.dragStart = this.getMousePosition(e);
    this.setSelectionStart(this.getSelectionStart());
    this.overlayElement?.classList.add('dragging');
    this.selectionElement?.classList.add('dragging');
  }

  /**
   * Handle mouse move during drag.
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.dragType) return;

    const current = this.getMousePosition(e);
    const deltaX = current.x - this.dragStart.x;
    const deltaY = current.y - this.dragStart.y;

    this.handleDragMove(current.x, current.y, deltaX, deltaY);
    this.render();
  }

  /**
   * Handle mouse up (end drag).
   */
  private handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragType = null;
      this.overlayElement?.classList.remove('dragging');
      this.selectionElement?.classList.remove('dragging');
    }
  }

  /**
   * Handle keyboard shortcuts (Escape/Enter).
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
   * Render the overlay with current values.
   */
  private render(): void {
    if (!this.overlayElement || !this.selectionElement || !this.container) return;

    const bbox = this.getSelectionBoundingBox();

    this.selectionElement.style.left = `${bbox.left}px`;
    this.selectionElement.style.top = `${bbox.top}px`;
    this.selectionElement.style.width = `${bbox.width}px`;
    this.selectionElement.style.height = `${bbox.height}px`;
    this.renderOverlayContent(bbox);
  }

  /**
   * Apply and call callback.
   */
  private apply(): void {
    if (this.onApply) {
      this.onApply(this.getApplyData());
    }
    this.destroy();
  }

  /**
   * Cancel and call callback.
   */
  private cancel(): void {
    if (this.onCancel) {
      this.onCancel();
    }
    this.destroy();
  }
}
