/**
 * Generic toggle component
 * Reusable toggle setup for any on/off state
 */

import { byID, toggleClasses, setText, setDisabled } from '@/utils';
import { loadSettings, showStatus, isSiteDisabled, toggleSite } from '@/extension';

interface ToggleConfig {
  toggleBtnId: string;
  containerId?: string;
  statusTextId?: string;
  labelId?: string;

  getState: () => Promise<boolean>;
  setState: (enabled: boolean) => Promise<void>;

  onStateChange?: (enabled: boolean) => void;

  statusMessages?: {
    enabled: string;
    disabled: string;
  };

  labelTexts?: {
    enabled: string;
    disabled: string;
  };

  labelValue?: string;
  disableIfNoLabel?: boolean;
}

/**
 * Sets up a generic toggle with declarative config
 */
async function setupToggle(config: ToggleConfig): Promise<void> {
  const toggleBtn = byID<HTMLButtonElement>(config.toggleBtnId);
  const container = config.containerId ? byID(config.containerId) : null;
  const statusText = config.statusTextId ? byID(config.statusTextId) : null;
  const labelEl = config.labelId ? byID(config.labelId) : null;

  const updateUI = (enabled: boolean) => {
    toggleClasses(container, { disabled: !enabled });
    toggleClasses(toggleBtn, { active: enabled, disabled: !enabled });

    if (statusText && config.labelTexts) {
      setText(statusText, enabled ? config.labelTexts.enabled : config.labelTexts.disabled);
    }

    config.onStateChange?.(enabled);
  };

  // Initialize label if provided
  if (labelEl && config.labelValue !== undefined) {
    labelEl.textContent = config.labelValue;
  }

  // Check if should be disabled
  if (config.disableIfNoLabel && !config.labelValue) {
    if (labelEl) labelEl.textContent = 'N/A';
    setDisabled(toggleBtn, true);
    return;
  }

  // Set initial state
  const initialState = await config.getState();
  updateUI(initialState);

  // Handle clicks
  toggleBtn?.addEventListener('click', async () => {
    const currentState = await config.getState();
    const newState = !currentState;

    await config.setState(newState);
    updateUI(newState);

    if (config.statusMessages) {
      showStatus(newState ? config.statusMessages.enabled : config.statusMessages.disabled);
    }
  });
}

export async function setupToggles(currentHostname: string | null): Promise<void> {
  // Global toggle
  await setupToggle({
    toggleBtnId: 'powerBtn',
    containerId: 'globalToggle',
    statusTextId: 'globalToggleStatus',
    getState: async () => {
      const settings = await loadSettings();
      return settings.extensionEnabled;
    },
    setState: async (enabled) => {
      await chrome.storage.sync.set({ extensionEnabled: enabled });
    },
    labelTexts: {
      enabled: 'Active',
      disabled: 'Paused',
    },
    statusMessages: {
      enabled: 'Extension enabled',
      disabled: 'Extension paused',
    },
  });

  // Site toggle
  await setupToggle({
    toggleBtnId: 'toggleBtn',
    containerId: 'siteToggle',
    labelId: 'siteName',
    labelValue: currentHostname || undefined,
    disableIfNoLabel: true,
    getState: async () => {
      if (!currentHostname) return false;
      const disabled = await isSiteDisabled(currentHostname);
      return !disabled;
    },
    setState: async () => {
      if (!currentHostname) return;
      await toggleSite(currentHostname);
    },
    statusMessages: {
      enabled: 'Site enabled',
      disabled: 'Site disabled',
    },
  });
}
