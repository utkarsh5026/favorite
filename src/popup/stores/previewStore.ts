import { create } from 'zustand';

interface PreviewState {
  currentFaviconUrl: string | null;
  originalFaviconUrl: string | null;
  livePreviewUrl: string | null;
  livePreviewInfo: {
    width: number;
    height: number;
    imageType: string;
  } | null;
  currentHostname: string | null;
  faviconLabel: string;
  faviconSizeLabel: string;
}

interface PreviewActions {
  setCurrentFavicon: (url: string | null) => void;
  setOriginalFavicon: (url: string | null) => void;
  setLivePreview: (url: string | null, info?: PreviewState['livePreviewInfo']) => void;
  setHostname: (hostname: string | null) => void;
  setFaviconInfo: (label: string, sizeLabel: string) => void;
  clearLivePreview: () => void;
}

type PreviewStore = PreviewState & PreviewActions;

export const usePreviewStore = create<PreviewStore>((set) => ({
  currentFaviconUrl: null,
  originalFaviconUrl: null,
  livePreviewUrl: null,
  livePreviewInfo: null,
  currentHostname: null,
  faviconLabel: 'Image',
  faviconSizeLabel: '-',

  setCurrentFavicon: (url: string | null) => {
    set({ currentFaviconUrl: url });
  },

  setOriginalFavicon: (url: string | null) => {
    set({ originalFaviconUrl: url });
  },

  setLivePreview: (url: string | null, info?: PreviewState['livePreviewInfo']) => {
    set({
      livePreviewUrl: url,
      livePreviewInfo: info ?? null,
    });
  },

  setHostname: (hostname: string | null) => {
    set({ currentHostname: hostname });
  },

  setFaviconInfo: (label: string, sizeLabel: string) => {
    set({
      faviconLabel: label,
      faviconSizeLabel: sizeLabel,
    });
  },

  clearLivePreview: () => {
    set({
      livePreviewUrl: null,
      livePreviewInfo: null,
    });
  },
}));
