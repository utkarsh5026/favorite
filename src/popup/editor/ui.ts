/**
 * Editor UI Manager
 * Handles the editor tab UI, toolbar buttons, and canvas display
 */

import { byID, downloadImage, setActive, toggleClasses, setDisabled } from '@/utils';
import { showStatus, getCurrentTabHostname, getCurrentTab } from '@/extension';
import { setCustomFavicon, saveFaviconZIP } from '@/favicons';
import { editorState } from './state';
import { applyShapeToImage } from './transforms';
import type { EditorState } from './types';
import type { FaviconShape } from '@/types';

/**
 * Editor UI Manager Class
 * Encapsulates all editor UI functionality
 */
export class EditorUI {
  private currentHostname: string | null = null;
  private backgroundColor: string = '#1a1a1d';

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

    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!imageUrl) {
      canvas.width = 200;
      canvas.height = 200;
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const currentShape = editorState.getShape();
    const shapedImageUrl = await applyShapeToImage(imageUrl, currentShape);

    const img = await downloadImage(shapedImageUrl);
    const containerWidth = container.clientWidth - 2; // Account for border
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
   * Setup action buttons (download, set default, apply)
   */
  private setupActionButtons(): void {
    byID('editorDownload')?.addEventListener('click', async () => {
      const imageUrl = editorState.getCurrentImage();
      if (!imageUrl) return;

      const btn = byID<HTMLButtonElement>('editorDownload');
      if (!btn) return;

      setDisabled(btn, true);

      try {
        const currentShape = editorState.getShape();
        const shapedImageUrl = await applyShapeToImage(imageUrl, currentShape);
        const img = await downloadImage(shapedImageUrl);
        await saveFaviconZIP(img, shapedImageUrl, this.currentHostname || 'edited');
        showStatus('Downloaded!');
      } catch (error) {
        console.error('Download failed:', error);
        showStatus('Download failed');
      } finally {
        setDisabled(btn, false);
      }
    });

    byID('editorSetDefault')?.addEventListener('click', async () => {
      const imageUrl = editorState.getCurrentImage();
      if (!imageUrl || !this.currentHostname) {
        showStatus('No image or hostname');
        return;
      }

      try {
        // Apply shape before setting as default
        const currentShape = editorState.getShape();
        const shapedImageUrl = await applyShapeToImage(imageUrl, currentShape);
        await setCustomFavicon(this.currentHostname, shapedImageUrl, () => {
          showStatus('Set as default!');
        });
      } catch (error) {
        console.error('Set default failed:', error);
        showStatus('Failed to set default');
      }
    });

    // Apply as Favicon
    byID('editorApplyFavicon')?.addEventListener('click', async () => {
      const imageUrl = editorState.getCurrentImage();
      if (!imageUrl) return;

      try {
        const currentShape = editorState.getShape();
        const shapedImageUrl = await applyShapeToImage(imageUrl, currentShape);

        const tab = await getCurrentTab();
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'contextMenuAction',
            action: 'preview',
            imageUrl: shapedImageUrl,
            hostname: this.currentHostname || '',
          });
          showStatus('Applied as favicon!');
        }
      } catch (error) {
        console.error('Apply favicon failed:', error);
        showStatus('Failed to apply');
      }
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
    const uploadZone = byID('editorUploadZone');
    const uploadInput = byID<HTMLInputElement>('editorUploadInput');

    if (!uploadZone || !uploadInput) return;

    uploadZone.addEventListener('click', () => {
      uploadInput.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      setActive(uploadZone, true);
      uploadZone.classList.add('drag-over'); // Keep for specificity
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleUploadFile(files[0]);
      }
    });

    uploadInput.addEventListener('change', () => {
      if (uploadInput.files && uploadInput.files.length > 0) {
        this.handleUploadFile(uploadInput.files[0]);
      }
    });
  }

  /**
   * Handle uploaded file
   */
  private handleUploadFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      showStatus('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showStatus('File too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        await this.loadImageIntoEditor(dataUrl);
      }
    };
    reader.readAsDataURL(file);
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
