import { useState, useCallback } from 'react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { Download, Eye, Star } from 'lucide-react';
import { downloadImage } from '@/utils';
import { saveFaviconZIP } from '@/favicons';
import { getCurrentTab, CONTEXT_MENU } from '@/extension';
import { useEditorStore, usePreviewStore, useUIStore } from '@/popup/stores';
import { applyShapeToImage } from '../../editor/transforms';
import { useEditorPreview } from '@/popup/hooks';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  isActive?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  icon,
  isActive = false,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`
        flex-1 flex items-center justify-center gap-1.5
        px-3 py-2.5 rounded-lg
        text-xs font-semibold
        cursor-pointer transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${isActive
          ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 hover:border-green-600'
          : 'bg-white/5 border border-white/12 text-text-secondary hover:bg-white/8 hover:border-white/25'
        }
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function EditorActions() {
  const currentImageUrl = useEditorStore((s) => s.currentImageUrl);
  const currentShape = useEditorStore((s) => s.currentShape);
  const shapeManipulation = useEditorStore((s) => s.shapeManipulation);

  const { livePreviewEnabled, toggleLivePreview, showStatus } = useUIStore();
  const currentHostname = usePreviewStore((s) => s.currentHostname);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEditorPreview();

  const getCurrentImage = useCallback(async (): Promise<string | null> => {
    if (!currentImageUrl) return null;
    return applyShapeToImage(currentImageUrl, currentShape, shapeManipulation);
  }, [currentImageUrl, currentShape, shapeManipulation]);

  const handleDownload = useCallback(async () => {
    const imageUrl = await getCurrentImage();
    if (!imageUrl) return;

    setIsDownloading(true);
    try {
      const img = await downloadImage(imageUrl);
      await saveFaviconZIP(img, imageUrl, currentHostname || 'edited');
      showStatus('Downloaded!');
    } catch (error) {
      console.error('Download failed:', error);
      showStatus('Download failed');
    } finally {
      setIsDownloading(false);
    }
  }, [getCurrentImage, currentHostname, showStatus]);

  const handleSetDefault = useCallback(async () => {
    const imageUrl = await getCurrentImage();
    if (!imageUrl) return;

    setIsApplying(true);
    try {
      const tab = await getCurrentTab();
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'contextMenuAction',
          action: CONTEXT_MENU.SET_DEFAULT,
          imageUrl,
          hostname: currentHostname || '',
        });
        showStatus('Applied as favicon!');
      }
    } catch (error) {
      console.error('Failed to apply:', error);
      showStatus('Failed to apply');
    } finally {
      setIsApplying(false);
    }
  }, [getCurrentImage, currentHostname, showStatus]);

  return (
    <div className="flex gap-2 mt-4">
      <ActionButton
        id="editorDownload"
        disabled={isDownloading || !currentImageUrl}
        onClick={() => void handleDownload()}
        icon={<Download className="w-3.5 h-3.5" />}
      >
        Download
      </ActionButton>

      <ActionButton
        id="editorApplyFavicon"
        onClick={toggleLivePreview}
        disabled={!currentImageUrl}
        isActive={livePreviewEnabled}
        icon={<Eye className="w-3.5 h-3.5" />}
      >
        {livePreviewEnabled ? 'Live Preview' : 'Preview'}
      </ActionButton>

      <ActionButton
        id="editorSetDefault"
        disabled={isApplying || !currentImageUrl}
        onClick={() => void handleSetDefault()}
        icon={<Star className="w-3.5 h-3.5" />}
      >
        Set Default
      </ActionButton>
    </div>
  );
}
