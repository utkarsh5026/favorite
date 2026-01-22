import { usePreviewStore } from '@/popup/stores';
import { useLivePreview, useOriginalFavicon } from '@/popup/hooks';
import { Image } from 'lucide-react';
import React from 'react';

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

interface PreviewBoxProps {
  imageUrl: string | null;
  isLoading?: boolean;
  label: string;
  placeholderLines: [string, string];
  altText: string;
}

const PreviewBox: React.FC<PreviewBoxProps> = ({
  imageUrl,
  isLoading = false,
  label,
  placeholderLines,
  altText,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-16 rounded-xl border border-border-light checkerboard flex items-center justify-center p-1.5 shadow-inset">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
            <div className="spinner-circle animate-rotate"></div>
            <span className="text-2xs text-text-subtle text-center leading-tight">Loading...</span>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={altText} className="w-full h-full rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <Image className="w-5 h-5 stroke-text-subtle" strokeWidth={1.5} />
            <span className="text-2xs text-text-subtle text-center leading-tight">
              {placeholderLines[0]}
              <br />
              {placeholderLines[1]}
            </span>
          </div>
        )}
      </div>
      <span className="text-[9px] text-text-subtle uppercase tracking-wide">{label}</span>
    </div>
  );
};
