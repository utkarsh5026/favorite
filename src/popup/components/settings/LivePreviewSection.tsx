import { usePreviewStore } from '@/popup/stores';
import { useLivePreview, useOriginalFavicon } from '@/popup/hooks';
import { PreviewBox } from '../common/PreviewBox';

export function LivePreviewSection() {
  const livePreviewUrl = usePreviewStore((state) => state.livePreviewUrl);
  const { originalFaviconUrl, isLoadingOriginal } = useOriginalFavicon();

  useLivePreview();

  return (
    <div className="bg-white/2 rounded-xl p-5 mb-4 border border-border-subtle">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-6">
          <PreviewBox
            imageUrl={livePreviewUrl}
            label="Preview"
            placeholderLines={['Hover', 'image']}
            altText="Live preview"
          />

          {/* VS Badge */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-white/3 border border-border-light flex items-center justify-center">
              <span className="text-[10px] text-text-subtle font-bold">VS</span>
            </div>
          </div>

          <PreviewBox
            imageUrl={originalFaviconUrl}
            isLoading={isLoadingOriginal}
            label="Original"
            placeholderLines={['No', 'favicon']}
            altText="Original favicon"
          />
        </div>
      </div>
    </div>
  );
}

