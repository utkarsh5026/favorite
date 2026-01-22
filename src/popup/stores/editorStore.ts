import { create } from 'zustand';
import type { FaviconShape } from '@/types';
import type { ShapeManipulationData } from '../editor/shapes/types';
import { toDataUrl } from '@/images';
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
  navigateHistory: (delta: number) => boolean;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
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

export const useEditorStore = create<EditorStore>((set, get) => {
  const navigateHistory = (delta: number): boolean => {
    const state = get();
    const newIndex = state.historyIndex + delta;
    const newImageUrl = state.historyStack[newIndex];

    set({ historyIndex: newIndex, currentImageUrl: newImageUrl });
    persistState(get());
    return true;
  };

  return {
    originalImageUrl: null,
    currentImageUrl: null,
    historyStack: [],
    historyIndex: -1,
    maxHistorySize: 20,
    currentShape: 'square',
    shapeManipulation: null,
    currentTabId: null,

    navigateHistory,

    loadImage: async (imageUrl: string) => {
      const { url: dataUrl } = await toDataUrl(imageUrl);

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
      return navigateHistory(-1);
    },

    redo: () => {
      const state = get();
      if (!state.canRedo()) return false;
      return navigateHistory(1);
    },

    canUndo: () => {
      return get().historyIndex > 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyIndex < state.historyStack.length - 1;
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
  };
});
