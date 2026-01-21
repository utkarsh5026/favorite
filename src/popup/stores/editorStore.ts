import { create } from 'zustand';
import type { FaviconShape } from '@/types';
import type { ShapeManipulationData } from '../editor/shapes/types';
import type { CropData } from '../editor/crop/types';
import { rotateImage, flipImage, executeTransform } from '../editor/transforms';
import { loadImageAsDataUrl } from '../editor/utils';
import { CropTransform } from '../editor/crop';
import { getItem, setItem, removeItem } from '@/extension/storage';

interface EditorState {
  originalImageUrl: string | null;
  currentImageUrl: string | null;
  historyStack: string[];
  historyIndex: number;
  maxHistorySize: number;
  currentShape: FaviconShape;
  shapeManipulation: ShapeManipulationData | null;
  currentTabId: number | null;
}

interface EditorActions {
  loadImage: (imageUrl: string) => Promise<void>;
  setCurrentImage: (imageUrl: string) => void;
  pushToHistory: (imageUrl: string) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  rotateClockwise: () => Promise<void>;
  rotateCounterClockwise: () => Promise<void>;
  flipHorizontal: () => Promise<void>;
  flipVertical: () => Promise<void>;
  cropImage: (cropData: CropData) => Promise<void>;
  setShape: (shape: FaviconShape) => void;
  setShapeManipulation: (manipulation: ShapeManipulationData | null) => void;
  reset: () => Promise<void>;
  resetToOriginal: () => void;
  initializeForTab: (tabId: number) => Promise<void>;
  hasImage: () => boolean;
}

type EditorStore = EditorState & EditorActions;

const getStorageKey = (tabId: number | null): string | null => {
  if (tabId === null) return null;
  return `editorState_tab_${tabId}`;
};

const persistState = async (state: EditorState) => {
  const storageKey = getStorageKey(state.currentTabId);
  if (!storageKey) return;

  const { currentTabId, ...persistableState } = state;
  await setItem(storageKey, persistableState);
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  originalImageUrl: null,
  currentImageUrl: null,
  historyStack: [],
  historyIndex: -1,
  maxHistorySize: 20,
  currentShape: 'square',
  shapeManipulation: null,
  currentTabId: null,

  loadImage: async (imageUrl: string) => {
    const dataUrl = await loadImageAsDataUrl(imageUrl);

    set({
      originalImageUrl: dataUrl,
      currentImageUrl: dataUrl,
      historyStack: [dataUrl],
      historyIndex: 0,
      currentShape: 'square',
      shapeManipulation: null,
    });

    await persistState(get());
  },

  setCurrentImage: (imageUrl: string) => {
    set({ currentImageUrl: imageUrl });
  },

  pushToHistory: (newImageUrl: string) => {
    const state = get();
    let historyStack = [...state.historyStack];
    let historyIndex = state.historyIndex;

    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }

    historyStack.push(newImageUrl);
    historyIndex++;

    if (historyStack.length > state.maxHistorySize) {
      historyStack.shift();
      historyIndex--;
    }

    set({ historyStack, historyIndex, currentImageUrl: newImageUrl });
    persistState(get());
  },

  undo: () => {
    const state = get();
    if (!state.canUndo()) return false;

    const newIndex = state.historyIndex - 1;
    const newImageUrl = state.historyStack[newIndex];

    set({ historyIndex: newIndex, currentImageUrl: newImageUrl });
    persistState(get());
    return true;
  },

  redo: () => {
    const state = get();
    if (!state.canRedo()) return false;

    const newIndex = state.historyIndex + 1;
    const newImageUrl = state.historyStack[newIndex];

    set({ historyIndex: newIndex, currentImageUrl: newImageUrl });
    persistState(get());
    return true;
  },

  canUndo: () => {
    return get().historyIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.historyStack.length - 1;
  },

  rotateClockwise: async () => {
    const state = get();
    if (!state.currentImageUrl) return;

    const transformed = await rotateImage(state.currentImageUrl, 90);
    get().pushToHistory(transformed);
  },

  rotateCounterClockwise: async () => {
    const state = get();
    if (!state.currentImageUrl) return;

    const transformed = await rotateImage(state.currentImageUrl, 270);
    get().pushToHistory(transformed);
  },

  flipHorizontal: async () => {
    const state = get();
    if (!state.currentImageUrl) return;

    const transformed = await flipImage(state.currentImageUrl, 'horizontal');
    get().pushToHistory(transformed);
  },

  flipVertical: async () => {
    const state = get();
    if (!state.currentImageUrl) return;

    const transformed = await flipImage(state.currentImageUrl, 'vertical');
    get().pushToHistory(transformed);
  },

  cropImage: async (cropData: CropData) => {
    const state = get();
    if (!state.currentImageUrl) return;

    const transformed = await executeTransform(state.currentImageUrl, new CropTransform(cropData));
    get().pushToHistory(transformed);
  },

  setShape: (shape: FaviconShape) => {
    set({ currentShape: shape });
    persistState(get());
  },

  setShapeManipulation: (manipulation: ShapeManipulationData | null) => {
    set({ shapeManipulation: manipulation });
    persistState(get());
  },

  reset: async () => {
    const tabId = get().currentTabId;
    const storageKey = getStorageKey(tabId);

    set({
      originalImageUrl: null,
      currentImageUrl: null,
      historyStack: [],
      historyIndex: -1,
      currentShape: 'square',
      shapeManipulation: null,
    });

    if (storageKey) {
      await removeItem(storageKey);
    }
  },

  resetToOriginal: () => {
    const state = get();
    if (!state.originalImageUrl) return;

    set({
      currentImageUrl: state.originalImageUrl,
      historyStack: [state.originalImageUrl],
      historyIndex: 0,
    });

    persistState(get());
  },

  initializeForTab: async (tabId: number) => {
    set({ currentTabId: tabId });

    const storageKey = getStorageKey(tabId);
    if (!storageKey) return;

    const persistedState = await getItem<Partial<EditorState>>(storageKey, undefined);

    if (persistedState) {
      set({
        ...persistedState,
        currentTabId: tabId,
      });
    }
  },

  hasImage: () => {
    return get().currentImageUrl !== null;
  },
}));
