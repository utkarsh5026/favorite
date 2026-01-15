/**
 * Editor UI Manager
 * Handles the editor tab UI, toolbar buttons, and canvas display
 */

import { byID, downloadImage, setActive, toggleClasses, setDisabled, setVisible } from '@/utils';
import { showStatus, getCurrentTabHostname, getCurrentTab, CONTEXT_MENU } from '@/extension';
import { saveFaviconZIP } from '@/favicons';
import { editorState } from './state';
import { applyShapeToImage } from './transforms';
import { setupUpload } from './upload';
import type { EditorState } from './types';
import type { FaviconShape } from '@/types';

/**
 * Editor UI Manager Class
 * Encapsulates all editor UI functionality
 */
export class EditorUI {
  private currentHostname: string | null = null;
  private backgroundColor: string = '#1a1a1d';
  private livePreviewEnabled: boolean = false;
  private previewDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

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
    const undoBtn = byID<HTMLButtonElement>('editorUndo');
    const redoBtn = byID<HTMLButtonElement>('editorRedo');

    setDisabled(undoBtn, !editorState.canUndo());
    setDisabled(redoBtn, !editorState.canRedo());
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
      canvas.width = 200;
      canvas.height = 200;
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    setVisible(loadingOverlay, true);

    try {
      const currentShape = editorState.getShape();
      const shapedImageUrl = await applyShapeToImage(imageUrl, currentShape);

      const img = await downloadImage(shapedImageUrl);
      const containerWidth = container.clientWidth - 2;
      const maxHeight = 250;

      let scale = 1;
      if (img.naturalWidth > containerWidth) {
        scale = containerWidth / img.naturalWidth;
      }
      if (img.naturalHeight * scale > maxHeight) {
        scale = maxHeight / img.naturalHeight;
      }

      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);

      // Fill background color
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      setVisible(loadingOverlay, false);
    } catch (error) {
      console.error('Failed to render canvas:', error);
      setVisible(loadingOverlay, false);
    }
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

    // Auto-preview when live preview is enabled
    if (this.livePreviewEnabled && state.currentImageUrl) {
      this.sendPreviewToTab();
    }
  }

  /**
   * Update the shape button states based on current shape
   */
  private updateShapeButtons(activeShape: FaviconShape): void {
    document.querySelectorAll('.shape-btn').forEach((btn) => {
      const shape = btn.getAttribute('data-shape');
      setActive(btn as HTMLElement, shape === activeShape);
    });
  }

  /**
   * Setup toolbar button event handlers
   */
  private setupToolbarButtons(): void {
    byID('editorUndo')?.addEventListener('click', () => editorState.undo());
    byID('editorRedo')?.addEventListener('click', () => editorState.redo());

    byID('editorRotateLeft')?.addEventListener('click', () => {
      editorState.rotateCounterClockwise();
    });
    byID('editorRotateRight')?.addEventListener('click', () => {
      editorState.rotateClockwise();
    });

    byID('editorFlipH')?.addEventListener('click', () => {
      editorState.flipHorizontal();
    });
    byID('editorFlipV')?.addEventListener('click', () => {
      editorState.flipVertical();
    });

    document.querySelectorAll('.shape-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const shape = btn.getAttribute('data-shape') as FaviconShape;
        if (shape) {
          editorState.setShape(shape);
        }
      });
    });
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

    this.previewDebounceTimeout = setTimeout(async () => {
      const imageUrl = await this.getCurrentImage();
      if (!imageUrl) return;

      try {
        const tab = await getCurrentTab();
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'contextMenuAction',
            action: CONTEXT_MENU.PREVIEW,
            imageUrl,
            hostname: this.currentHostname || '',
          });
        }
      } catch (error) {
        console.error('Failed to send preview:', error);
      }
    }, 100);
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
   * Setup background color picker
   */
  private setupBackgroundColorPicker(): void {
    const colorPicker = byID<HTMLInputElement>('canvasBgColor');
    if (!colorPicker) return;

    chrome.storage.local.get('editorBackgroundColor', (result) => {
      if (result.editorBackgroundColor) {
        this.backgroundColor = result.editorBackgroundColor;
        colorPicker.value = this.backgroundColor;
        this.renderCanvas(editorState.getCurrentImage());
      }
    });

    colorPicker.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.backgroundColor = target.value;

      chrome.storage.local.set({ editorBackgroundColor: this.backgroundColor });
      this.renderCanvas(editorState.getCurrentImage());
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
        // Clear the pending image
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
   * Initialize the editor UI
   */
  async setup(): Promise<void> {
    // Get current hostname
    this.currentHostname = await getCurrentTabHostname();

    // Subscribe to state changes
    editorState.subscribe(this.onStateChange.bind(this));

    // Setup components
    this.setupToolbarButtons();
    this.setupActionButtons();
    this.setupBackgroundColorPicker();
    this.setupEditorUpload();
    this.setupKeyboardShortcuts();

    // Check for pending edit image
    await this.checkPendingEditImage();

    // Initial state update
    this.onStateChange(editorState.getState());
  }
}

// Export singleton instance and convenience function
export const editorUI = new EditorUI();
export const setupEditorUI = () => editorUI.setup();
export const loadImageIntoEditor = (imageUrl: string) => editorUI.loadImageIntoEditor(imageUrl);
