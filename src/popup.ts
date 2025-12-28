import type { FaviconShape, UserSettings, LockedImage, CustomFavicons } from './types';
import { DEFAULT_SETTINGS } from './state';
import {
  setCustomFavicon,
  loadCustomFaviconSection,
  removeCustomFavicon,
  saveFaviconZIP,
} from './favicon';

let currentFaviconUrl: string | null = null;
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
      if (!tab?.url) {
        resolve(null);
        return;
      }
      try {
        const url = new URL(tab.url);
        resolve(url.hostname);
      } catch {
        resolve(null);
      }
    });
  });
}

async function isSiteDisabled(hostname: string): Promise<boolean> {
  const settings = await loadSettings();
  return settings.disabledSites.includes(hostname);
}

async function toggleSite(hostname: string) {
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

async function getLockedImage(): Promise<LockedImage | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('lockedImage', (result) => {
      const lockedImage = result.lockedImage as LockedImage | undefined;
      if (lockedImage && lockedImage.hostname === currentHostname) {
        resolve(lockedImage);
      } else {
        resolve(null);
      }
    });
  });
}

async function unlockImage(): Promise<void> {
  await chrome.storage.local.remove('lockedImage');
  showStatus('Image unlocked');

  // Refresh the UI
  updateLockUI(false);

  // Clear current image and show placeholder
  const faviconPreview = document.getElementById('faviconPreview');
  const faviconImage = document.getElementById('faviconImage') as HTMLImageElement;
  const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
  const downloadInfo = document.getElementById('downloadInfo');

  if (faviconPreview) {
    faviconPreview.classList.remove('loaded');
    faviconPreview.classList.add('error');
  }
  if (faviconImage) {
    faviconImage.classList.remove('loaded');
    faviconImage.src = '';
  }
  if (downloadBtn) {
    downloadBtn.disabled = true;
  }
  if (downloadInfo) {
    downloadInfo.innerHTML = 'Hover image + <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> to lock';
  }

  currentFaviconUrl = null;
}

function updateLockUI(locked: boolean): void {
  const lockBadge = document.getElementById('lockBadge');
  const unlockBtn = document.getElementById('unlockBtn');
  const faviconLabel = document.getElementById('faviconLabel');
  const downloadInfo = document.getElementById('downloadInfo');
  const setDefaultBtn = document.getElementById('setDefaultBtn') as HTMLButtonElement;

  if (lockBadge) {
    lockBadge.classList.toggle('visible', locked);
  }
  if (unlockBtn) {
    unlockBtn.classList.toggle('visible', locked);
  }
  if (faviconLabel) {
    faviconLabel.textContent = locked ? 'Locked Image' : 'Image';
  }
  if (downloadInfo && locked) {
    downloadInfo.textContent = 'Includes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256';
  }
  if (setDefaultBtn) {
    setDefaultBtn.disabled = !locked;
  }
}

async function loadFaviconPreview(): Promise<void> {
  const faviconPreview = document.getElementById('faviconPreview');
  const faviconImage = document.getElementById('faviconImage') as HTMLImageElement;
  const faviconSizeLabel = document.getElementById('faviconSizeLabel');
  const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

  if (!faviconPreview || !faviconImage) return;

  const lockedImage = await getLockedImage();

  if (lockedImage) {
    updateLockUI(true);

    faviconImage.onload = () => {
      currentFaviconUrl = lockedImage.url;
      faviconImage.classList.add('loaded');
      faviconPreview.classList.add('loaded');

      if (faviconSizeLabel) {
        faviconSizeLabel.textContent = `${faviconImage.naturalWidth}x${faviconImage.naturalHeight}`;
      }

      if (downloadBtn) {
        downloadBtn.disabled = false;
      }
    };

    faviconImage.onerror = () => {
      faviconPreview.classList.add('error');
      updateLockUI(false);
    };

    faviconImage.src = lockedImage.url;
    return;
  }

  faviconPreview.classList.add('error');
  updateLockUI(false);
}

async function generateFaviconZip(): Promise<void> {
  const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

  if (!currentFaviconUrl || !downloadBtn) return;

  downloadBtn.disabled = true;
  downloadBtn.classList.add('loading');
  downloadBtn.querySelector('span')!.textContent = 'Generating...';

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = currentFaviconUrl!;
    });

    if (!currentFaviconUrl) return;
    await saveFaviconZIP(img, currentFaviconUrl, currentHostname || 'site');

    showStatus('Downloaded!');
  } catch (error) {
    console.error('Failed to generate favicon ZIP:', error);
    showStatus('Download failed');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('loading');
    downloadBtn.querySelector('span')!.textContent = 'Download as ZIP';
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

  // Load favicon preview and set up download
  await loadFaviconPreview();

  if (currentHostname) await loadCustomFaviconSection(currentHostname);

  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn?.addEventListener('click', generateFaviconZip);

  const unlockBtn = document.getElementById('unlockBtn');
  unlockBtn?.addEventListener('click', unlockImage);

  const setDefaultBtn = document.getElementById('setDefaultBtn');
  setDefaultBtn?.addEventListener('click', () => {
    if (!currentFaviconUrl || !currentHostname) return;
    setCustomFavicon(currentHostname, currentFaviconUrl, () => {
      showStatus('Set as default!');
    });
  });

  const removeDefaultBtn = document.getElementById('removeDefaultBtn');
  removeDefaultBtn?.addEventListener('click', () => {
    if (!currentHostname) return;
    removeCustomFavicon(currentHostname, () => {
      showStatus('Default removed');
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
