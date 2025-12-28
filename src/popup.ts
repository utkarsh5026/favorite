import type { FaviconShape } from './types';

interface Settings {
  faviconShape: FaviconShape;
  hoverDelay: number;
  restoreDelay: number;
  faviconSize: number;
}

const DEFAULT_SETTINGS: Settings = {
  faviconShape: 'circle',
  hoverDelay: 100,
  restoreDelay: 200,
  faviconSize: 32
};

async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      resolve(result as Settings);
    });
  });
}

async function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      showStatus('Settings saved');
      resolve();
    });
  });
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

async function init(): Promise<void> {
  const settings = await loadSettings();

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
