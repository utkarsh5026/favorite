/**
 * Editor State Manager
 * Manages the image editor state with undo/redo support
 */

import type { EditorState } from './types';
import { rotateImage, flipImage } from './transforms';
import { loadImageAsDataUrl } from './utils';

type StateChangeCallback = (state: EditorState) => void;

/**
 * Manages the state of the image editor with history support
 */
export class EditorStateManager {
  private state: EditorState;
  private listeners: StateChangeCallback[] = [];
  private currentTabId: number | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): EditorState {
    return {
      originalImageUrl: null,
      currentImageUrl: null,
      historyStack: [],
      historyIndex: -1,
      maxHistorySize: 20,
      currentShape: 'square',
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(shouldPersist: boolean = true): void {
    this.listeners.forEach((cb) => cb(this.state));
    if (shouldPersist) {
      this.persistState();
    }
  }

  /**
   * Initialize the editor with a specific tab ID for persistence
   */
  async initializeForTab(tabId: number): Promise<void> {
    this.currentTabId = tabId;
    await this.loadPersistedState();
  }

  /**
   * Get the storage key for the current tab
   */
  private getStorageKey(): string | null {
    if (this.currentTabId === null) return null;
    return `editorState_tab_${this.currentTabId}`;
  }

  /**
   * Persist the current state to chrome storage
   */
  private async persistState(): Promise<void> {
    const storageKey = this.getStorageKey();
    if (!storageKey) return;

    try {
      await chrome.storage.local.set({
        [storageKey]: this.state,
      });
    } catch (error) {
      console.error('Failed to persist editor state:', error);
    }
  }

  /**
   * Load persisted state from chrome storage
   */
  private async loadPersistedState(): Promise<void> {
    const storageKey = this.getStorageKey();
    if (!storageKey) return;

    try {
      const result = await chrome.storage.local.get(storageKey);
      const persistedState = result[storageKey] as EditorState | undefined;

      if (persistedState) {
        this.state = persistedState;
        // Notify listeners without persisting to avoid circular write
        this.notifyListeners(false);
      }
    } catch (error) {
      console.error('Failed to load persisted editor state:', error);
    }
  }

  /**
   * Clear persisted state for the current tab
   */
  async clearPersistedState(): Promise<void> {
    const storageKey = this.getStorageKey();
    if (!storageKey) return;

    try {
      await chrome.storage.local.remove(storageKey);
    } catch (error) {
      console.error('Failed to clear persisted editor state:', error);
    }
  }

  /**
   * Load an image into the editor
   */
  async loadImage(imageUrl: string): Promise<void> {
    // Convert to data URL if needed
    const dataUrl = await loadImageAsDataUrl(imageUrl);

    this.state = {
      ...this.createInitialState(),
      originalImageUrl: dataUrl,
      currentImageUrl: dataUrl,
      historyStack: [dataUrl],
      historyIndex: 0,
      currentShape: 'square', // Reset shape when loading new image
    };

    this.notifyListeners();
  }

  /**
   * Push current state to history before making a change
   */
  private pushToHistory(newImageUrl: string): void {
    // Remove any redo states (states after current index)
    if (this.state.historyIndex < this.state.historyStack.length - 1) {
      this.state.historyStack = this.state.historyStack.slice(0, this.state.historyIndex + 1);
    }

    // Add new state
    this.state.historyStack.push(newImageUrl);
    this.state.historyIndex++;

    // Limit history size
    if (this.state.historyStack.length > this.state.maxHistorySize) {
      this.state.historyStack.shift();
      this.state.historyIndex--;
    }
  }

  /**
   * Apply an image transformation and update state
   */
  private async applyTransformation(
    transformFn: (imageUrl: string) => Promise<string>
  ): Promise<void> {
    if (!this.state.currentImageUrl) return;

    const transformed = await transformFn(this.state.currentImageUrl);
    this.pushToHistory(transformed);
    this.state.currentImageUrl = transformed;
    this.notifyListeners();
  }

  /**
   * Rotate the image clockwise by 90 degrees
   */
  async rotateClockwise(): Promise<void> {
    await this.applyTransformation((url) => rotateImage(url, 90));
  }

  /**
   * Rotate the image counter-clockwise by 90 degrees
   */
  async rotateCounterClockwise(): Promise<void> {
    await this.applyTransformation((url) => rotateImage(url, 270));
  }

  /**
   * Flip the image horizontally
   */
  async flipHorizontal(): Promise<void> {
    await this.applyTransformation((url) => flipImage(url, 'horizontal'));
  }

  /**
   * Flip the image vertically
   */
  async flipVertical(): Promise<void> {
    await this.applyTransformation((url) => flipImage(url, 'vertical'));
  }

  /**
   * Navigate history by applying an index delta
   */
  private navigateHistory(canNavigate: () => boolean, delta: number): boolean {
    if (!canNavigate()) return false;

    this.state.historyIndex += delta;
    this.state.currentImageUrl = this.state.historyStack[this.state.historyIndex];
    this.notifyListeners();
    return true;
  }

  /**
   * Undo the last action
   */
  undo(): boolean {
    return this.navigateHistory(() => this.canUndo(), -1);
  }

  /**
   * Redo the last undone action
   */
  redo(): boolean {
    return this.navigateHistory(() => this.canRedo(), 1);
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.state.historyIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.state.historyIndex < this.state.historyStack.length - 1;
  }

  /**
   * Get the current image URL
   */
  getCurrentImage(): string | null {
    return this.state.currentImageUrl;
  }

  /**
   * Get the original image URL
   */
  getOriginalImage(): string | null {
    return this.state.originalImageUrl;
  }

  /**
   * Get the full state
   */
  getState(): EditorState {
    return { ...this.state };
  }

  /**
   * Check if an image is loaded
   */
  hasImage(): boolean {
    return this.state.currentImageUrl !== null;
  }

  /**
   * Set the current shape for the image
   */
  setShape(shape: import('@/types').FaviconShape): void {
    this.state.currentShape = shape;
    this.notifyListeners();
  }

  /**
   * Get the current shape
   */
  getShape(): import('@/types').FaviconShape {
    return this.state.currentShape;
  }

  /**
   * Reset the editor to initial state
   */
  async reset(): Promise<void> {
    this.state = this.createInitialState();
    await this.clearPersistedState();
    this.notifyListeners(false);
  }

  /**
   * Reset to original image
   */
  resetToOriginal(): void {
    if (!this.state.originalImageUrl) return;

    this.state.currentImageUrl = this.state.originalImageUrl;
    this.state.historyStack = [this.state.originalImageUrl];
    this.state.historyIndex = 0;
    this.notifyListeners();
  }
}

export const editorState = new EditorStateManager();
