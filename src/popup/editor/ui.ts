/**
 * Editor UI Manager
 * Handles the editor tab UI, toolbar buttons, and canvas display
 */

import {
  byID,
  downloadImage,
  toggleClasses,
  setDisabled,
  setVisible,
  tryCatchAsync,
} from '@/utils';
import { showStatus, getCurrentTabHostname, getCurrentTab, CONTEXT_MENU } from '@/extension';
import { saveFaviconZIP } from '@/favicons';
import { editorState } from './state';
import { applyShapeToImage } from './transforms';
import { setupUpload } from './upload';
import { CropOverlay } from './crop';
import { ShapeSelector } from './shapes';
import { Toolbar } from './toolbar';
import type { CropData } from './crop';
import type { EditorState } from './types';
import type { FaviconShape } from '@/types';

const CHECKED_SQUARE_SIZE = 8;
const EMPTY_CANVAS_SIZE = 200;
const MAX_CANVAS_HEIGHT = 250;
const CANVAS_PADDING = 2;
const PREVIEW_DEBOUNCE_MS = 100;
const CONTAINER_MIN_WIDTH = 300;

/**
 * Editor UI Manager Class
 * Encapsulates all editor UI functionality
 */
export class EditorUI {
  private currentHostname: string | null = null;
  private livePreviewEnabled: boolean = false;
  private previewDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private cropOverlay: CropOverlay | null = null;
  private isCropMode: boolean = false;
  private shapeSelector: ShapeSelector | null = null;
  private toolbar: Toolbar | null = null;

  /**
   * Load an image into the editor
   */
  async loadImageIntoEditor(imageUrl: string): Promise<void> {
    await editorState.loadImage(imageUrl);
  }

  /**
   * Update the toolbar button states based on editor state
   */
  private updateToolbarState(): void {
    this.toolbar?.setDisabled('undo', !editorState.canUndo());
    this.toolbar?.setDisabled('redo', !editorState.canRedo());
  }

  /**
   * Draw a checkered pattern background on the canvas
   */
  private drawCheckeredBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
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

  /**
   * Render the current image on the canvas
   */
  private async renderCanvas(imageUrl: string | null): Promise<void> {
    const canvas = byID<HTMLCanvasElement>('editorCanvas');
    const container = byID('editorCanvasContainer');
    const loadingOverlay = byID('editorLoading');

    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!imageUrl) {
      setVisible(loadingOverlay, false);
      canvas.width = EMPTY_CANVAS_SIZE;
      canvas.height = EMPTY_CANVAS_SIZE;
      this.drawCheckeredBackground(ctx, canvas.width, canvas.height);
      return;
    }

    setVisible(loadingOverlay, true);

    const drawCanvas = async () => {
      const currentShape = editorState.getShape();
      const shapedImageUrl = await applyShapeToImage(imageUrl, currentShape);

      const img = await downloadImage(shapedImageUrl);
      let containerWidth = container.clientWidth - CANVAS_PADDING;

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

      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);

      this.drawCheckeredBackground(ctx, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      setVisible(loadingOverlay, false);
    };

    await tryCatchAsync(drawCanvas, () => {
      console.error('Failed to render canvas');
      setVisible(loadingOverlay, false);
    });
  }

  /**
   * Update the editor tab visibility based on whether an image is loaded
   */
  private updateEditorVisibility(hasImage: boolean): void {
    const editorTab = byID('editorTab');
    toggleClasses(editorTab, { 'has-image': hasImage });
  }

  /**
   * Handle state changes from the editor state manager
   */
  private async onStateChange(state: EditorState): Promise<void> {
    this.updateEditorVisibility(state.currentImageUrl !== null);
    this.updateToolbarState();
    await this.renderCanvas(state.currentImageUrl);
    this.updateShapeButtons(state.currentShape);
    if (this.livePreviewEnabled && state.currentImageUrl) {
      this.sendPreviewToTab();
    }
  }

  /**
   * Update the shape button states based on current shape
   */
  private updateShapeButtons(activeShape: FaviconShape): void {
    this.shapeSelector?.setActiveShape(activeShape);
  }

  /**
   * Setup toolbar with all buttons
   */
  private setupToolbar(): void {
    const container = byID('toolbarButtons');
    if (!container) return;

    this.toolbar = new Toolbar();
    this.toolbar.init(container, {
      undo: () => {
        editorState.undo();
      },
      redo: () => {
        editorState.redo();
      },
      rotateLeft: () => editorState.rotateCounterClockwise(),
      rotateRight: () => editorState.rotateClockwise(),
      flipH: () => editorState.flipHorizontal(),
      flipV: () => editorState.flipVertical(),
      crop: () => this.enterCropMode(),
      reset: () => {
        if (confirm('Reset all changes to the original image?')) {
          editorState.resetToOriginal();
        }
      },
    });
  }

  /**
   * Setup the shape selector component
   */
  private setupShapeSelector(): void {
    const container = byID('shapeSelector');
    if (!container) return;

    this.shapeSelector = new ShapeSelector();
    this.shapeSelector.init(container, (shape) => {
      editorState.setShape(shape);
    });

    const resetBtn = byID('editorReset');
    if (resetBtn) {
      resetBtn.classList.add('reset-btn-right');
      container.appendChild(resetBtn);
    }
  }

  /**
   * Get the current edited image with shape applied
   */
  private async getCurrentImage(): Promise<string | null> {
    const imageUrl = editorState.getCurrentImage();
    if (!imageUrl) {
      return null;
    }
    const currentShape = editorState.getShape();
    return await applyShapeToImage(imageUrl, currentShape);
  }

  /**
   * Update the preview button appearance based on live preview state
   */
  private updatePreviewButtonState(): void {
    const btn = byID<HTMLButtonElement>('editorApplyFavicon');
    if (!btn) return;

    if (this.livePreviewEnabled) {
      btn.classList.add('live-preview-active');
      const textNode = Array.from(btn.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      if (textNode) {
        textNode.textContent = '\n              Live Preview\n            ';
      }
    } else {
      btn.classList.remove('live-preview-active');
      const textNode = Array.from(btn.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      if (textNode) {
        textNode.textContent = '\n              Preview\n            ';
      }
    }
  }

  /**
   * Send preview to the current tab (debounced)
   */
  private sendPreviewToTab(): void {
    if (this.previewDebounceTimeout) {
      clearTimeout(this.previewDebounceTimeout);
    }

    const sendPreview = async () => {
      const imageUrl = await this.getCurrentImage();
      if (!imageUrl) {
        return;
      }

      const tab = await getCurrentTab();
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'contextMenuAction',
          action: CONTEXT_MENU.PREVIEW,
          imageUrl,
          hostname: this.currentHostname || '',
        });
      }
    };

    this.previewDebounceTimeout = setTimeout(async () => {
      await tryCatchAsync(sendPreview, () => {
        console.error('Failed to send preview to tab');
      });
    }, PREVIEW_DEBOUNCE_MS);
  }

  /**
   * Generic handler for button actions with loading state and error handling
   */
  private async handleButtonAction(
    buttonId: string | null,
    action: () => Promise<void>,
    successMessage: string,
    errorMessage: string
  ): Promise<void> {
    const btn = buttonId ? byID<HTMLButtonElement>(buttonId) : null;

    if (btn) setDisabled(btn, true);

    try {
      await action();
      showStatus(successMessage);
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      showStatus(errorMessage);
    } finally {
      if (btn) setDisabled(btn, false);
    }
  }

  /**
   * Setup action buttons (download, set default, apply)
   */
  private setupActionButtons(): void {
    byID('editorDownload')?.addEventListener('click', async () => {
      const currImage = await this.getCurrentImage();
      if (!currImage) return;

      await this.handleButtonAction(
        'editorDownload',
        async () => {
          const img = await downloadImage(currImage);
          await saveFaviconZIP(img, currImage, this.currentHostname || 'edited');
        },
        'Downloaded!',
        'Download failed'
      );
    });

    byID('editorApplyFavicon')?.addEventListener('click', () => {
      this.livePreviewEnabled = !this.livePreviewEnabled;
      this.updatePreviewButtonState();

      // Send initial preview when enabling
      if (this.livePreviewEnabled && editorState.hasImage()) {
        this.sendPreviewToTab();
      }
    });

    byID('editorSetDefault')?.addEventListener('click', async () => {
      const imageUrl = await this.getCurrentImage();
      if (!imageUrl) return;

      await this.handleButtonAction(
        null,
        async () => {
          const tab = await getCurrentTab();
          if (tab?.id) {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'contextMenuAction',
              action: CONTEXT_MENU.SET_DEFAULT,
              imageUrl,
              hostname: this.currentHostname || '',
            });
          }
        },
        'Applied as favicon!',
        'Failed to apply'
      );
    });
  }

  /**
   * Setup upload zone in editor tab
   */
  private setupEditorUpload(): void {
    setupUpload(async (dataUrl) => {
      await this.loadImageIntoEditor(dataUrl);
    });
  }

  /**
   * Check for pending edit image from context menu
   */
  private async checkPendingEditImage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('pendingEditImage');
      if (result.pendingEditImage?.imageUrl) {
        await this.loadImageIntoEditor(result.pendingEditImage.imageUrl);
        await chrome.storage.local.remove('pendingEditImage');
      }
    } catch (error) {
      console.error('Failed to load pending edit image:', error);
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if (!editorState.hasImage()) return;
      if (this.isCropMode) return;

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          editorState.undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          editorState.redo();
        }
      }
    });
  }

  /**
   * Enter crop mode - show the crop overlay
   */
  private async enterCropMode(): Promise<void> {
    if (this.isCropMode || !editorState.hasImage()) return;

    const container = byID('editorCanvasContainer');
    const canvas = byID<HTMLCanvasElement>('editorCanvas');
    const imageUrl = editorState.getCurrentImage();

    if (!container || !canvas || !imageUrl) return;

    try {
      const img = await downloadImage(imageUrl);
      const imageWidth = img.naturalWidth;
      const imageHeight = img.naturalHeight;
      let containerWidth = container.clientWidth - 2;
      const maxHeight = 250;

      if (containerWidth <= 0) {
        containerWidth = 300;
      }

      let displayScale = 1;
      if (imageWidth > containerWidth) {
        displayScale = containerWidth / imageWidth;
      }
      if (imageHeight * displayScale > maxHeight) {
        displayScale = maxHeight / imageHeight;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const boundary = {
        x: canvasRect.left - containerRect.left,
        y: canvasRect.top - containerRect.top,
        width: canvas.width,
        height: canvas.height,
      };

      this.isCropMode = true;
      this.cropOverlay = new CropOverlay();
      this.setToolbarEnabled(false);

      this.cropOverlay.init(
        container,
        imageWidth,
        imageHeight,
        displayScale,
        boundary,
        (cropData: CropData) => this.handleCropApply(cropData),
        () => this.handleCropCancel()
      );
    } catch (error) {
      console.error('Failed to enter crop mode:', error);
      this.isCropMode = false;
    }
  }

  /**
   * Handle crop apply
   */
  private async handleCropApply(cropData: CropData): Promise<void> {
    this.isCropMode = false;
    this.cropOverlay = null;
    this.setToolbarEnabled(true);

    try {
      await editorState.cropImage(cropData);
      showStatus('Image cropped!');
    } catch (error) {
      console.error('Failed to apply crop:', error);
      showStatus('Crop failed');
    }
  }

  /**
   * Handle crop cancel
   */
  private handleCropCancel(): void {
    this.isCropMode = false;
    this.cropOverlay = null;
    this.setToolbarEnabled(true);
  }

  /**
   * Enable/disable toolbar buttons
   */
  private setToolbarEnabled(enabled: boolean): void {
    this.toolbar?.setAllEnabled(enabled, {
      undo: editorState.canUndo(),
      redo: editorState.canRedo(),
    });
  }

  /**
   * Initialize the editor UI
   */
  async setup(): Promise<void> {
    const tab = await getCurrentTab();
    this.currentHostname = await getCurrentTabHostname();

    if (tab?.id) {
      await editorState.initializeForTab(tab.id);
    }

    editorState.subscribe(this.onStateChange.bind(this));
    this.setupToolbar();
    this.setupShapeSelector();
    this.setupActionButtons();
    this.setupEditorUpload();
    this.setupKeyboardShortcuts();
    await this.checkPendingEditImage();
    requestAnimationFrame(() => {
      this.onStateChange(editorState.getState());
    });
  }
}

export const editorUI = new EditorUI();
export const setupEditorUI = () => editorUI.setup();
export const loadImageIntoEditor = (imageUrl: string) => editorUI.loadImageIntoEditor(imageUrl);
