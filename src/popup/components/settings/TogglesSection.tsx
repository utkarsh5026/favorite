import { Power, Globe, LucideIcon } from 'lucide-react';
import { useChromeStorage } from '../../hooks/useChromeStorage';
import { usePreviewStore } from '@/popup/stores/previewStore';


export function TogglesSection() {
  const currentHostname = usePreviewStore((state) => state.currentHostname);
  const [isExtensionEnabled, setIsExtensionEnabled] = useChromeStorage('extensionEnabled', true, 'sync');
  const [disabledSites, setDisabledSites] = useChromeStorage<string[]>('disabledSites', [], 'sync');

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
      <ToggleRow
        icon={Power}
        label="Extension"
        checked={isExtensionEnabled}
        onChange={handleGlobalToggle}
        title="Toggle extension on/off"
        statusTitle={isExtensionEnabled ? 'Extension is active' : 'Extension is inactive'}
        className="mb-2 pb-2.5 border-b border-white/5"
      />

      <ToggleRow
        icon={Globe}
        label="Site"
        checked={isSiteEnabled}
        onChange={handleSiteToggle}
        title="Toggle tracking for this site"
        statusTitle={isSiteEnabled ? 'Site is active' : 'Site is inactive'}
        disabled={!currentHostname}
        additionalContent={
          <span className="text-xs text-text-primary truncate">{currentHostname || '-'}</span>
        }
      />
    </div>
  );
}


interface ToggleRowProps {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: () => void;
  title?: string;
  statusTitle?: string;
  disabled?: boolean;
  additionalContent?: React.ReactNode;
  className?: string;
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
  title,
  statusTitle,
  disabled = false,
  additionalContent,
  className = '',
}: ToggleRowProps) {
  return (
    <div className={`flex items-center justify-between py-1.5 px-1 ${className}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Icon className="w-3.5 h-3.5 stroke-text-subtle shrink-0" strokeWidth={2} />
        <span className="text-xs text-text-secondary font-medium shrink-0">{label}</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {additionalContent}
          {(!additionalContent || checked !== undefined) && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${checked ? 'bg-accent-green' : 'bg-text-muted/40'
                }`}
              title={statusTitle}
            />
          )}
        </div>
      </div>
      <ToggleButton checked={checked} onChange={onChange} title={title} disabled={disabled} />
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