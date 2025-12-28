import type { FaviconShape, UserSettings } from './types';
import { DEFAULT_SETTINGS } from './state';

let currentHostname: string | null = null;

async function loadSettings(): Promise<UserSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      resolve(result as UserSettings);
    });
  });
}

async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      showStatus('Settings saved');
      resolve();
    });
  });
}

async function getCurrentTabHostname(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          resolve(url.hostname);
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

async function isSiteDisabled(hostname: string): Promise<boolean> {
  const settings = await loadSettings();
  return settings.disabledSites.includes(hostname);
}

async function toggleSite(hostname: string): Promise<boolean> {
  const settings = await loadSettings();
  const disabledSites = [...settings.disabledSites];
  const index = disabledSites.indexOf(hostname);

  if (index === -1) {
    disabledSites.push(hostname);
  } else {
    disabledSites.splice(index, 1);
  }

  await new Promise<void>((resolve) => {
    chrome.storage.sync.set({ disabledSites }, resolve);
  });

  return index === -1; // Returns true if site is now disabled
}

function showStatus(message: string): void {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
    status.classList.add('show');
    setTimeout(() => {
      status.classList.remove('show');
    }, 1500);
  }
}

function updateShapeButtons(shape: FaviconShape): void {
  document.querySelectorAll('.shape-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-shape') === shape);
  });
}

function updateSliderValue(id: string, value: number, suffix: string): void {
  const valueEl = document.getElementById(`${id}Value`);
  if (valueEl) {
    valueEl.textContent = `${value}${suffix}`;
  }
}

function updateToggleButton(isDisabled: boolean): void {
  const toggleBtn = document.getElementById('toggleBtn');
  const toggleText = document.getElementById('toggleText');

  if (toggleBtn && toggleText) {
    toggleBtn.classList.toggle('disabled', isDisabled);
    toggleText.textContent = isDisabled ? 'Disabled' : 'Enabled';
  }
}

async function init(): Promise<void> {
  const settings = await loadSettings();

  // Get current site hostname
  currentHostname = await getCurrentTabHostname();
  const siteNameEl = document.getElementById('siteName');
  const toggleBtn = document.getElementById('toggleBtn');

  if (siteNameEl && currentHostname) {
    siteNameEl.textContent = currentHostname;
    const isDisabled = await isSiteDisabled(currentHostname);
    updateToggleButton(isDisabled);
  } else if (siteNameEl) {
    siteNameEl.textContent = 'N/A';
    if (toggleBtn) {
      toggleBtn.setAttribute('disabled', 'true');
      (toggleBtn as HTMLButtonElement).style.opacity = '0.5';
      (toggleBtn as HTMLButtonElement).style.cursor = 'not-allowed';
    }
  }

  // Toggle button listener
  toggleBtn?.addEventListener('click', async () => {
    if (!currentHostname) return;

    const isNowDisabled = await toggleSite(currentHostname);
    updateToggleButton(isNowDisabled);
    showStatus(isNowDisabled ? 'Site disabled' : 'Site enabled');
  });

  // Set shape buttons
  updateShapeButtons(settings.faviconShape);

  // Set sliders
  const hoverDelayInput = document.getElementById('hoverDelay') as HTMLInputElement;
  const restoreDelayInput = document.getElementById('restoreDelay') as HTMLInputElement;
  const faviconSizeInput = document.getElementById('faviconSize') as HTMLInputElement;

  if (hoverDelayInput) {
    hoverDelayInput.value = String(settings.hoverDelay);
    updateSliderValue('hoverDelay', settings.hoverDelay, 'ms');
  }

  if (restoreDelayInput) {
    restoreDelayInput.value = String(settings.restoreDelay);
    updateSliderValue('restoreDelay', settings.restoreDelay, 'ms');
  }

  if (faviconSizeInput) {
    faviconSizeInput.value = String(settings.faviconSize);
    updateSliderValue('faviconSize', settings.faviconSize, 'px');
  }

  // Shape button listeners
  document.querySelectorAll('.shape-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const shape = btn.getAttribute('data-shape') as FaviconShape;
      updateShapeButtons(shape);
      await saveSettings({ faviconShape: shape });
    });
  });

  // Slider listeners
  hoverDelayInput?.addEventListener('input', async () => {
    const value = Number(hoverDelayInput.value);
    updateSliderValue('hoverDelay', value, 'ms');
    await saveSettings({ hoverDelay: value });
  });

  restoreDelayInput?.addEventListener('input', async () => {
    const value = Number(restoreDelayInput.value);
    updateSliderValue('restoreDelay', value, 'ms');
    await saveSettings({ restoreDelay: value });
  });

  faviconSizeInput?.addEventListener('input', async () => {
    const value = Number(faviconSizeInput.value);
    updateSliderValue('faviconSize', value, 'px');
    await saveSettings({ faviconSize: value });
  });
}

document.addEventListener('DOMContentLoaded', init);
