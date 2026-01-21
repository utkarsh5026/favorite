import { useEffect, useState } from 'react';
import { Image } from 'lucide-react';
import { usePreviewStore } from '../../stores/previewStore';
import { useLivePreview } from '../../hooks/useLivePreview';
import { getFaviconDirectlyFromTab } from '@/extension';

export function LivePreviewSection() {
  const { livePreviewUrl, originalFaviconUrl, setOriginalFavicon } = usePreviewStore();
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(true);

  useLivePreview();

  useEffect(() => {
    const loadOriginalFavicon = async () => {
      setIsLoadingOriginal(true);
      const faviconUrl = await getFaviconDirectlyFromTab();
      setOriginalFavicon(faviconUrl);
      setIsLoadingOriginal(false);
    };

    loadOriginalFavicon();
  }, [setOriginalFavicon]);

  return (
    <div className="bg-white/2 rounded-xl p-5 mb-4 border border-border-subtle">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-6">
          {/* Live Preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-xl border border-border-light checkerboard flex items-center justify-center p-1.5 shadow-inset">
              {livePreviewUrl ? (
                <img
                  src={livePreviewUrl}
                  alt="Live preview"
                  className="w-full h-full rounded-lg object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Image className="w-5 h-5 stroke-text-subtle" strokeWidth={1.5} />
                  <span className="text-2xs text-text-subtle text-center leading-tight">
                    Hover
                    <br />
                    image
                  </span>
                </div>
              )}
            </div>
            <span className="text-[9px] text-text-subtle uppercase tracking-wide">Preview</span>
          </div>

          {/* VS Badge */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-white/3 border border-border-light flex items-center justify-center">
              <span className="text-[10px] text-text-subtle font-bold">VS</span>
            </div>
          </div>

          {/* Original Favicon */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-xl border border-border-light checkerboard flex items-center justify-center p-1.5 shadow-inset">
              {isLoadingOriginal ? (
                <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
                  <div className="spinner-circle animate-rotate"></div>
                  <span className="text-2xs text-text-subtle text-center leading-tight">
                    Loading...
                  </span>
                </div>
              ) : originalFaviconUrl ? (
                <img
                  src={originalFaviconUrl}
                  alt="Original favicon"
                  className="w-full h-full rounded-lg object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Image className="w-5 h-5 stroke-text-subtle" strokeWidth={1.5} />
                  <span className="text-2xs text-text-subtle text-center leading-tight">
                    No
                    <br />
                    favicon
                  </span>
                </div>
              )}
            </div>
            <span className="text-[9px] text-text-subtle uppercase tracking-wide">Original</span>
          </div>
        </div>
      </div>
    </div>
  );
}
