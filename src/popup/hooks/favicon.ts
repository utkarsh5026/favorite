import { useEffect, useState } from 'react';
import { usePreviewStore } from '@/popup/stores';
import { getFaviconDirectlyFromTab } from '@/extension';
import { useShallow } from 'zustand/shallow';

export function useOriginalFavicon() {
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(true);
  const originalFaviconUrl = usePreviewStore((state) => state.originalFaviconUrl);
  const setOriginalFavicon = usePreviewStore((state) => state.setOriginalFavicon);

  useEffect(() => {
    const loadOriginalFavicon = async () => {
      setIsLoadingOriginal(true);
      const faviconUrl = await getFaviconDirectlyFromTab();
      setOriginalFavicon(faviconUrl);
      setIsLoadingOriginal(false);
    };

    loadOriginalFavicon();
  }, [setOriginalFavicon]);

  return {
    originalFaviconUrl,
    isLoadingOriginal,
  };
}

export function useCurrentFavicon() {
  return usePreviewStore(
    useShallow(({ currentFaviconUrl, setCurrentFavicon }) => ({
      currentFaviconUrl,
      setCurrentFavicon,
    }))
  );
}
