import { Power, Globe } from 'lucide-react';
import { useChromeStorage } from '../../hooks/useChromeStorage';
import { usePreviewStore } from '../../stores/previewStore';


export function TogglesSection() {
  const currentHostname = usePreviewStore((state) => state.currentHostname);
  const [isExtensionEnabled, setIsExtensionEnabled] = useChromeStorage('extensionEnabled', true);
  const [disabledSites, setDisabledSites] = useChromeStorage<string[]>('disabledSites', []);

  const isSiteEnabled = currentHostname ? !disabledSites.includes(currentHostname) : true;

  const handleGlobalToggle = async () => {
    await setIsExtensionEnabled(!isExtensionEnabled);
  };

  const handleSiteToggle = async () => {
    if (!currentHostname) return;

    if (isSiteEnabled) {
      await setDisabledSites([...disabledSites, currentHostname]);
    } else {
      await setDisabledSites(disabledSites.filter((site) => site !== currentHostname));
    }
  };

  return (
    <div className="bg-white/2 rounded-lg p-2.5 border border-border-subtle backdrop-blur-xs">
      <div className="flex items-center justify-between py-1.5 px-1 mb-2 pb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Power className="w-3.5 h-3.5 stroke-text-subtle" strokeWidth={2} />
          <span className="text-xs text-text-secondary font-medium">Extension</span>
          <span
            className={`text-xs font-medium ${isExtensionEnabled ? 'text-accent-green' : 'text-text-muted'
              }`}
          >
            {isExtensionEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>
        <ToggleButton
          checked={isExtensionEnabled}
          onChange={handleGlobalToggle}
          title="Toggle extension on/off"
        />
      </div>

      {/* Site Toggle */}
      <div className="flex items-center justify-between py-1.5 px-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="w-3.5 h-3.5 stroke-text-subtle shrink-0" strokeWidth={2} />
          <span className="text-xs text-text-secondary font-medium shrink-0">Site</span>
          <span className="text-xs text-text-primary truncate">{currentHostname || '-'}</span>
        </div>
        <ToggleButton
          checked={isSiteEnabled}
          onChange={handleSiteToggle}
          title="Toggle tracking for this site"
          disabled={!currentHostname}
        />
      </div>
    </div>
  );
}


interface ToggleButtonProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title?: string;
}

function ToggleButton({ checked, onChange, disabled = false, title }: ToggleButtonProps) {
  const className = [
    'toggle-switch',
    checked && 'active',
    disabled && 'disabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      onClick={onChange}
      title={title}
      disabled={disabled}
      aria-checked={checked}
      role="switch"
    >
      <span className="toggle-slider"></span>
    </button>
  );
}