import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { usePreviewStore } from '../../stores/previewStore';
import { useUIStore } from '../../stores/uiStore';
import { getFaviconDirectlyFromTab } from '@/extension';
import { removeItem } from '@/extension/storage';

const BASE_BUTTON_CLASSES =
  'flex-1 flex items-center justify-center gap-2 bg-white/[0.05] border rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-250 ease-bounce text-sm font-medium font-mono tracking-tight hover:-translate-y-px';

export function ResetSection() {
  const currentHostname = usePreviewStore((state) => state.currentHostname);
  const { showStatus } = useUIStore();
  const [siteFaviconUrl, setSiteFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadSiteFavicon = async () => {
      const faviconUrl = await getFaviconDirectlyFromTab();
      setSiteFaviconUrl(faviconUrl);
    };

    loadSiteFavicon();
  }, []);

  const handleReset = async (config: {
    confirmMessage: string;
    action: () => Promise<void>;
    successMessage: string;
    errorMessage: string;
    errorLogPrefix: string;
  }) => {
    const confirmed = confirm(config.confirmMessage);
    if (!confirmed) return;

    try {
      await config.action();
      showStatus(config.successMessage, 3000);
    } catch (error) {
      console.error(`${config.errorLogPrefix}:`, error);
      showStatus(config.errorMessage, 3000);
    }
  };

  const handleResetSite = async () => {
    if (!currentHostname) return;

    await handleReset({
      confirmMessage: `Reset all settings for ${currentHostname}? This will remove any custom favicons and restore defaults.`,
      action: async () => {
        await removeItem(`customFavicon_${currentHostname}`);
        await removeItem(`faviconState_${currentHostname}`);
      },
      successMessage: `Settings reset for ${currentHostname}`,
      errorMessage: 'Failed to reset site settings',
      errorLogPrefix: 'Failed to reset site settings',
    });
  };

  const handleResetAll = async () => {
    await handleReset({
      confirmMessage:
        'Reset ALL extension settings? This will:\n' +
        '- Remove all custom favicons\n' +
        '- Clear all site-specific settings\n' +
        '- Reset extension to default state\n\n' +
        'This action cannot be undone!',
      action: async () => {
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
        setTimeout(() => window.location.reload(), 1500);
      },
      successMessage: 'All settings reset successfully',
      errorMessage: 'Failed to reset all settings',
      errorLogPrefix: 'Failed to reset all settings',
    });
  };

  return (
    <div className="mt-4.5 pt-4.5 border-t border-border-light">
      <label className="block text-sm font-medium text-text-subtle mb-2.5 uppercase tracking-wider">
        Reset
      </label>
      <div className="flex gap-2.5">
        <button
          className={`${BASE_BUTTON_CLASSES} border-border-medium text-text-secondary hover:bg-white/8 hover:border-white/25 disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={handleResetSite}
          disabled={!currentHostname}
          title="Reset settings for this site only"
        >
          {siteFaviconUrl && (
            <img src={siteFaviconUrl} className="w-4 h-4 rounded-sm object-contain" alt="" />
          )}
          <span>This Site</span>
        </button>
        <button
          className={`${BASE_BUTTON_CLASSES} border-accent-red/30 text-accent-red hover:bg-accent-red/15 hover:border-accent-red/50`}
          onClick={handleResetAll}
          title="Reset all settings to default"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
          <span>Reset All</span>
        </button>
      </div>
    </div>
  );
}
