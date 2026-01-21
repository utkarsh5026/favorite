import { create } from 'zustand';

type TabId = 'settings' | 'editor';
type OverlayMode = 'none' | 'crop' | 'shape';

interface UIState {
  currentTab: TabId;
  overlayMode: OverlayMode;
  pendingShape: string | null;
  livePreviewEnabled: boolean;
  isLoading: boolean;
  loadingMessage: string | null;
  statusMessage: string | null;
  statusTimeout: number | null;
}

interface UIActions {
  switchToTab: (tabId: TabId) => void;
  enterCropMode: () => void;
  enterShapeEditMode: (shape?: string) => void;
  exitOverlayMode: () => void;
  toggleLivePreview: () => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  showStatus: (message: string, duration?: number) => void;
  clearStatus: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set, get) => ({
  currentTab: 'settings',
  overlayMode: 'none',
  pendingShape: null,
  livePreviewEnabled: true,
  isLoading: false,
  loadingMessage: null,
  statusMessage: null,
  statusTimeout: null,

  switchToTab: (tabId: TabId) => {
    set({ currentTab: tabId });
  },

  enterCropMode: () => {
    set({ overlayMode: 'crop' });
  },

  enterShapeEditMode: (shape?: string) => {
    set({ overlayMode: 'shape', pendingShape: shape ?? null });
  },

  exitOverlayMode: () => {
    set({ overlayMode: 'none', pendingShape: null });
  },

  toggleLivePreview: () => {
    set((state) => ({ livePreviewEnabled: !state.livePreviewEnabled }));
  },

  setLoading: (isLoading: boolean, message?: string) => {
    set({ isLoading, loadingMessage: message ?? null });
  },

  showStatus: (message: string, duration: number = 3000) => {
    const { statusTimeout } = get();
    if (statusTimeout) {
      clearTimeout(statusTimeout);
    }

    const timeout = window.setTimeout(() => {
      set({ statusMessage: null, statusTimeout: null });
    }, duration);

    set({ statusMessage: message, statusTimeout: timeout });
  },

  clearStatus: () => {
    const { statusTimeout } = get();
    if (statusTimeout) {
      clearTimeout(statusTimeout);
    }
    set({ statusMessage: null, statusTimeout: null });
  },
}));
