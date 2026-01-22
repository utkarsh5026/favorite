import { useEffect, useState } from 'react';
import { usePreviewStore } from '@/popup/stores';
import { getCurrentTabHostname } from '@/extension';
import { getOriginalFaviconUrl } from '@/favicons';
import { useShallow } from 'zustand/shallow';

export function useOriginalFavicon() {
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(true);
  const originalFaviconUrl = usePreviewStore((state) => state.originalFaviconUrl);
  const setOriginalFavicon = usePreviewStore((state) => state.setOriginalFavicon);

  useEffect(() => {
    const loadOriginalFavicon = async () => {
      setIsLoadingOriginal(true);
      const hostname = await getCurrentTabHostname();
      const faviconUrl = hostname ? await getOriginalFaviconUrl(hostname) : null;
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
