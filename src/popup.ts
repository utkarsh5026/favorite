import type { FaviconShape, LockedImage, UserSettings } from './types';
import { DEFAULT_SETTINGS } from './state';
import {
  loadCustomFaviconSection,
  removeCustomFavicon,
  saveFaviconZIP,
  setCustomFavicon,
} from './favicon';
import { applyShapeToPreview } from './shape';
import { byID, downloadImage } from './utils';

let currentFaviconUrl: string | null = null;
let currentHostname: string | null = null;

async function loadSettings(): Promise<UserSettings> {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return result as UserSettings;
}

async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  await chrome.storage.sync.set(settings);
  showStatus('Settings saved');
}

async function getCurrentTabHostname(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url) {
    return null;
  }

  try {
    const url = new URL(tab.url);
    return url.hostname;
  } catch {
    return null;
  }
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

  await chrome.storage.sync.set({ disabledSites });
  return index === -1; // Returns true if site is now disabled
}

function showStatus(message: string): void {
  const status = byID('status');
  if (status) {
    status.textContent = message;
    status.classList.add('show');
    setTimeout(() => {
      status.classList.remove('show');
    }, 1500);
  }
}

async function getLockedImage(): Promise<LockedImage | null> {
  const result = await chrome.storage.local.get('lockedImage');
  const lockedImage = result.lockedImage as LockedImage | undefined;
  if (lockedImage && lockedImage.hostname === currentHostname) {
    return lockedImage;
  }
  return null;
}

async function unlockImage(): Promise<void> {
  await chrome.storage.local.remove('lockedImage');
  showStatus('Image unlocked');
  updateLockUI(false);

  const faviconPreview = byID('faviconPreview');
  const faviconImage = byID('faviconImage') as HTMLImageElement;
  const downloadBtn = byID('downloadBtn') as HTMLButtonElement;
  const downloadInfo = byID('downloadInfo');

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
    downloadInfo.innerHTML =
      'Hover image + <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>L</kbd> to lock';
  }

  currentFaviconUrl = null;
}

function updateLockUI(locked: boolean): void {
  const lockBadge = byID('lockBadge');
  const unlockBtn = byID('unlockBtn');
  const faviconLabel = byID('faviconLabel');
  const downloadInfo = byID('downloadInfo');
  const setDefaultBtn = byID('setDefaultBtn') as HTMLButtonElement;

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
  const faviconPreview = byID('faviconPreview');
  const faviconImage = byID('faviconImage') as HTMLImageElement;
  const faviconSizeLabel = byID('faviconSizeLabel');
  const downloadBtn = byID('downloadBtn') as HTMLButtonElement;

  if (!faviconPreview || !faviconImage) return;

  const lockedImage = await getLockedImage();

  if (lockedImage) {
    updateLockUI(true);

    faviconImage.onload = async () => {
      await onFaviconLoaded(
        faviconImage,
        faviconPreview,
        lockedImage,
        downloadBtn,
        faviconSizeLabel
      );
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

async function onFaviconLoaded(
  faviconImage: HTMLImageElement,
  faviconPreview: HTMLElement,
  lockedImage: LockedImage,
  downloadBtn: HTMLButtonElement,
  faviconSizeLabel: HTMLElement | null
): Promise<void> {
  currentFaviconUrl = lockedImage.url;
  faviconImage.classList.add('loaded');
  faviconPreview.classList.add('loaded');

  if (faviconSizeLabel) {
    faviconSizeLabel.textContent = `${faviconImage.naturalWidth}x${faviconImage.naturalHeight}`;
  }

  if (downloadBtn) {
    downloadBtn.disabled = false;
  }

  const settings = await loadSettings();
  await applyShapeToPreview(settings.faviconShape, currentFaviconUrl);
}

async function generateFaviconZip(): Promise<void> {
  const downloadBtn = byID('downloadBtn') as HTMLButtonElement;

  if (!currentFaviconUrl || !downloadBtn) return;

  const btnText = downloadBtn.querySelector('span')!;
  const originalText = btnText.textContent;

  downloadBtn.disabled = true;
  downloadBtn.classList.add('loading');
  btnText.textContent = 'Generating...';

  try {
    if (!currentFaviconUrl) return;
    const img = await downloadImage(currentFaviconUrl);
    await saveFaviconZIP(img, currentFaviconUrl, currentHostname || 'site');

    // Success animation
    downloadBtn.classList.remove('loading');
    downloadBtn.classList.add('success');
    btnText.textContent = 'Downloaded!';
    showStatus('Downloaded!');

    setTimeout(() => {
      downloadBtn.classList.remove('success');
      btnText.textContent = originalText || 'Download ZIP';
      downloadBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to generate favicon ZIP:', error);
    showStatus('Download failed');
    downloadBtn.classList.remove('loading');
    btnText.textContent = originalText || 'Download ZIP';
    downloadBtn.disabled = false;
  }
}

function updateShapeButtons(shape: FaviconShape): void {
  document.querySelectorAll('.shape-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-shape') === shape);
  });
}

function updateSliderValue(id: string, value: number, suffix: string): void {
  const valueEl = byID(`${id}Value`);
  if (valueEl) {
    valueEl.textContent = `${value}${suffix}`;
  }
}

function updateToggleButton(isDisabled: boolean): void {
  const toggleBtn = byID('toggleBtn');
  const toggleText = byID('toggleText');

  if (toggleBtn && toggleText) {
    toggleBtn.classList.toggle('disabled', isDisabled);
    toggleText.textContent = isDisabled ? 'Disabled' : 'Enabled';
  }
}

/**
 * Listens for changes to the locked image and reloads preview
 */
function listenForLockedImageChanges(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.lockedImage) {
      // Reload the favicon preview when locked image changes
      loadFaviconPreview();
    }
  });
}

async function init(): Promise<void> {
  const settings = await loadSettings();

  currentHostname = await getCurrentTabHostname();
  const siteNameEl = byID('siteName');
  const toggleBtn = byID('toggleBtn');

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

  toggleBtn?.addEventListener('click', async () => {
    if (!currentHostname) return;

    const isNowDisabled = await toggleSite(currentHostname);
    updateToggleButton(isNowDisabled);
    showStatus(isNowDisabled ? 'Site disabled' : 'Site enabled');
  });

  // Set shape buttons
  updateShapeButtons(settings.faviconShape);

  // Set sliders
  const hoverDelayInput = byID('hoverDelay') as HTMLInputElement;
  const restoreDelayInput = byID('restoreDelay') as HTMLInputElement;
  const faviconSizeInput = byID('faviconSize') as HTMLInputElement;

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

  document.querySelectorAll('.shape-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const shape = btn.getAttribute('data-shape') as FaviconShape;
      updateShapeButtons(shape);
      if (currentFaviconUrl) await applyShapeToPreview(shape, currentFaviconUrl);
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

  // Listen for changes to locked image
  listenForLockedImageChanges();

  const downloadBtn = byID('downloadBtn');
  downloadBtn?.addEventListener('click', generateFaviconZip);

  const unlockBtn = byID('unlockBtn');
  unlockBtn?.addEventListener('click', unlockImage);

  const setDefaultBtn = byID('setDefaultBtn') as HTMLButtonElement;
  setDefaultBtn?.addEventListener('click', () => {
    if (!currentFaviconUrl || !currentHostname || !setDefaultBtn) return;

    const btnText = setDefaultBtn.querySelector('span')!;
    const originalText = btnText.textContent;

    setDefaultBtn.disabled = true;
    setDefaultBtn.classList.add('loading');
    btnText.textContent = 'Setting...';

    setCustomFavicon(currentHostname, currentFaviconUrl, () => {
      setDefaultBtn.classList.remove('loading');
      setDefaultBtn.classList.add('success');
      btnText.textContent = 'Done!';
      showStatus('Set as default!');

      setTimeout(() => {
        setDefaultBtn.classList.remove('success');
        btnText.textContent = originalText || 'Set Default';
        setDefaultBtn.disabled = false;
      }, 2000);
    });
  });

  const removeDefaultBtn = byID('removeDefaultBtn');
  removeDefaultBtn?.addEventListener('click', () => {
    if (!currentHostname) return;
    removeCustomFavicon(currentHostname, () => {
      showStatus('Default removed');
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
