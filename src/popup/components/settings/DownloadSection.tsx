import { useEffect, useState, useRef } from 'react';
import { Download, Pencil } from 'lucide-react';
import { useUIStore, usePreviewStore } from '@/popup/stores';
import { getFaviconDirectlyFromTab } from '@/extension';
import { saveFaviconZIP } from '@/favicons';
import { PreviewBox } from '../common/PreviewBox';

export function DownloadSection() {
  const { currentFaviconUrl, setCurrentFavicon } = usePreviewStore();
  const switchToTab = useUIStore((state) => state.switchToTab);
  const [isLoading, setIsLoading] = useState(true);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const [hostname, setHostname] = useState<string>('favicon');

  useEffect(() => {
    const loadCurrentFavicon = async () => {
      setIsLoading(true);
      const faviconUrl = await getFaviconDirectlyFromTab();
      setCurrentFavicon(faviconUrl);
      setIsLoading(false);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url) {
        try {
          const url = new URL(tab.url);
          setHostname(url.hostname);
        } catch {
          setHostname('favicon');
        }
      }

      if (faviconUrl) {
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
          imageElementRef.current = img;
        };
        img.src = faviconUrl;
      }
    };

    loadCurrentFavicon();
  }, [setCurrentFavicon]);

  const handleDownload = async () => {
    if (!currentFaviconUrl || !imageElementRef.current) return;
    try {
      await saveFaviconZIP(imageElementRef.current, currentFaviconUrl, hostname);
    } catch (error) {
      console.error('Failed to download favicon ZIP:', error);
    }
  };

  const handleEdit = () => {
    switchToTab('editor');
  };

  const buttonBaseClasses =
    'flex-1 flex items-center justify-center gap-2 bg-white/5 border border-border-medium rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-250 ease-bounce text-text-secondary text-sm font-medium font-mono tracking-tight hover:bg-white/8 hover:border-white/25 hover:-translate-y-px';

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2.5">
        <label className="text-sm font-medium text-text-subtle uppercase tracking-wider">
          Image to Download
        </label>
      </div>

      <div className="flex items-center gap-3.5 bg-white/2 rounded-lg p-3.5 mb-3 border border-border-subtle backdrop-blur-xs">
        <PreviewBox
          imageUrl={currentFaviconUrl}
          isLoading={isLoading}
          placeholderLines="No image"
          altText="Current favicon"
          size="sm"
        />
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-md text-text-primary font-normal">Image</span>
          <span className="text-sm text-text-muted">
            {imageSize ? `${imageSize.width}x${imageSize.height}` : '-'}
          </span>
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          className={`${buttonBaseClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={handleDownload}
          disabled={!currentFaviconUrl || !imageElementRef.current}
          title="Download favicon as ZIP with multiple sizes"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={2} />
          <span>Download</span>
        </button>
        <button className={buttonBaseClasses} onClick={handleEdit} title="Edit in editor">
          <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
          <span>Edit</span>
        </button>
      </div>
    </div>
  );
}
