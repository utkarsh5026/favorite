import { useEffect, useState } from 'react';
import { usePreviewStore } from '@/popup/stores';
import { getFaviconDirectlyFromTab } from '@/extension';

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
