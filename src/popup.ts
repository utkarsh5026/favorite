import type { FaviconShape, LockedImage, UserSettings } from './types';
import { DEFAULT_SETTINGS } from './state';
import { saveFaviconZIP, CustomFaviconManager } from './favicon';
import { applyShapeToPreview } from './shape';
import { all, byID, downloadImage } from './utils';

let currentFaviconUrl: string | null = null;

/**
 * Loads user settings from Chrome storage
 * @returns Promise that resolves to the user settings object
 */
async function loadSettings(): Promise<UserSettings> {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return result as UserSettings;
}

/**
 * Saves user settings to Chrome storage and displays a status message
 * @param settings - Partial user settings object to save
 */
async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  await chrome.storage.sync.set(settings);
  showStatus('Settings saved');
}

/**
 * Gets the hostname of the current active tab
 * @returns Promise that resolves to the hostname or null if unavailable
 */
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

/**
 * Checks if the extension is disabled for a specific site
 * @param hostname - The hostname to check
 * @returns Promise that resolves to true if the site is disabled, false otherwise
 */
async function isSiteDisabled(hostname: string): Promise<boolean> {
  const settings = await loadSettings();
  return settings.disabledSites.includes(hostname);
}

/**
 * Toggles the enabled/disabled state for a specific site
 * @param hostname - The hostname to toggle
 * @returns Promise that resolves to true if site was disabled, false if enabled
 */
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
  return index === -1;
}

/**
 * Displays a temporary status message to the user
 * @param message - The message to display
 */
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

/**
 * Retrieves the locked image for a specific hostname from storage
 * @param hostname - The hostname to get the locked image for
 * @returns Promise that resolves to the locked image or null if not found
 */
async function getLockedImage(hostname: string): Promise<LockedImage | null> {
  const result = await chrome.storage.local.get('lockedImage');
  const lockedImage = result.lockedImage as LockedImage | undefined;
  if (lockedImage && lockedImage.hostname === hostname) {
    return lockedImage;
  }
  return null;
}

/**
 * Unlocks the currently locked image and resets the UI
 */
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
    downloadInfo.innerHTML = 'Hover image + <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>L</kbd> to lock';
  }

  currentFaviconUrl = null;
}

/**
 * Updates the UI elements to reflect the locked/unlocked state
 * @param locked - True if an image is locked, false otherwise
 */
function updateLockUI(locked: boolean): void {
  const lockBadge = byID('lockBadge');
  const unlockBtn = byID('unlockBtn');
  const faviconLabel = byID('faviconLabel');
  const downloadInfo = byID('downloadInfo');
  const setDefaultBtn = byID<HTMLButtonElement>('setDefaultBtn');

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

/**
 * Loads and displays the favicon preview for a specific hostname
 * @param hostname - The hostname to load the favicon preview for
 */
async function loadFaviconPreview(hostname: string): Promise<void> {
  const faviconPreview = byID('faviconPreview');
  const faviconImage = byID<HTMLImageElement>('faviconImage');
  const faviconSizeLabel = byID('faviconSizeLabel');
  const downloadBtn = byID<HTMLButtonElement>('downloadBtn');

  if (!faviconPreview || !faviconImage) return;

  const lockedImage = await getLockedImage(hostname);

  if (lockedImage) {
    updateLockUI(true);

    faviconImage.onload = async () => {
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

/**
 * Generates and downloads a ZIP file containing multiple sizes of the favicon
 * @param faviconURL - The URL of the favicon to generate sizes from
 * @param hostname - The hostname to use in the filename, or null to use 'site'
 */
async function generateFaviconZip(faviconURL: string, hostname: string | null): Promise<void> {
  const downloadBtn = byID<HTMLButtonElement>('downloadBtn');
  if (!downloadBtn) return;

  const btnText = downloadBtn.querySelector('span')!;
  const originalText = btnText.textContent;

  downloadBtn.disabled = true;
  downloadBtn.classList.add('loading');
  btnText.textContent = 'Generating...';

  try {
    if (!faviconURL) return;
    const img = await downloadImage(faviconURL);
    await saveFaviconZIP(img, faviconURL, hostname || 'site');

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

/**
 * Sets up the site enable/disable toggle button and updates its state
 * @param hostname - The hostname to set up the toggle for, or null if unavailable
 */
async function setupSiteToggle(hostname: string | null): Promise<void> {
  const siteNameEl = byID('siteName');
  const toggleBtn = byID<HTMLButtonElement>('toggleBtn');

  const updateToggleButton = (isDisabled: boolean, btn: HTMLButtonElement | null): void => {
    const toggleText = byID('toggleText');
    if (btn && toggleText) {
      btn.classList.toggle('disabled', isDisabled);
      toggleText.textContent = isDisabled ? 'Disabled' : 'Enabled';
    }
  };

  toggleBtn?.addEventListener('click', async () => {
    if (!hostname) return;

    const disabled = await toggleSite(hostname);
    updateToggleButton(disabled, toggleBtn);
    showStatus(disabled ? 'Site disabled' : 'Site enabled');
  });

  if (siteNameEl && hostname) {
    siteNameEl.textContent = hostname;
    const disabled = await isSiteDisabled(hostname);
    updateToggleButton(disabled, toggleBtn);
    return;
  }

  if (siteNameEl) {
    siteNameEl.textContent = 'N/A';
    if (!toggleBtn) return;
    toggleBtn.setAttribute('disabled', 'true');
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
  }
}

/**
 * Sets up the favicon shape selection buttons and their click handlers
 * @param faviconShape - The currently selected favicon shape
 * @param faviconURL - The URL of the current favicon, or null if unavailable
 */
function setupShapeButtons(faviconShape: FaviconShape, faviconURL: string | null): void {
  const updateShapeButtons = (shape: FaviconShape): void => {
    document.querySelectorAll('.shape-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-shape') === shape);
    });
  };

  const handleBtnClick = async (btn: HTMLButtonElement) => {
    const shape = btn.getAttribute('data-shape') as FaviconShape;
    updateShapeButtons(shape);
    await Promise.all([
      currentFaviconUrl ? applyShapeToPreview(shape, currentFaviconUrl) : Promise.resolve(),
      saveSettings({ faviconShape: shape }),
    ]);
  };

  updateShapeButtons(faviconShape);
  all<HTMLButtonElement>('.shape-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleBtnClick(btn);
    });
  });
}

/**
 * Sets up the configuration sliders for hover delay, restore delay, and favicon size
 * @param settings - The current user settings to populate slider values
 */
function setupSliders(settings: UserSettings): void {
  const updateSliderValue = (id: string, value: number, suffix: string): void => {
    const valueEl = byID(`${id}Value`);
    if (!valueEl) return;
    valueEl.textContent = `${value}${suffix}`;
  };

  const setup = (elName: string, setting: keyof UserSettings, suffix: string) => {
    const el = byID<HTMLInputElement>(elName);
    if (!el) return;

    el.value = String(settings[setting]);
    updateSliderValue(elName, settings.hoverDelay, suffix);

    el.addEventListener('input', async () => {
      const value = Number(el.value);
      updateSliderValue(elName, value, suffix);
      await saveSettings({ [setting]: value });
    });
  };

  setup('hoverDelay', 'hoverDelay', 'ms');
  setup('restoreDelay', 'restoreDelay', 'ms');
  setup('faviconSize', 'faviconSize', 'px');
}

/**
 * Sets up and executes setting a custom favicon as the default for a hostname
 * @param btn - The button element triggering the action
 * @param hostname - The hostname to set the default favicon for
 * @param faviconURL - The URL of the favicon to set as default
 */
function setupDefaultImage(btn: HTMLButtonElement, hostname: string, faviconURL: string): void {
  const btnText = btn.querySelector('span')!;
  const originalText = btnText.textContent;

  btn.disabled = true;
  btn.classList.add('loading');
  btnText.textContent = 'Setting...';

  CustomFaviconManager.setCustomFavicon(hostname, faviconURL, () => {
    btn.classList.remove('loading');
    btn.classList.add('success');
    btnText.textContent = 'Done!';
    showStatus('Set as default!');

    setTimeout(() => {
      btn.classList.remove('success');
      btnText.textContent = originalText || 'Set Default';
      btn.disabled = false;
    }, 2000);
  });
}

/**
 * Listens for changes to the locked image and reloads preview
 */
function listenForLockedImageChanges(hostname: string): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.lockedImage) {
      loadFaviconPreview(hostname);
    }
  });
}

/**
 * Initializes the popup by loading settings, setting up UI components, and attaching event listeners
 */
async function init(): Promise<void> {
  const settings = await loadSettings();

  const currentHostname = await getCurrentTabHostname();
  setupSiteToggle(currentHostname);
  setupSliders(settings);
  setupShapeButtons(settings.faviconShape, currentFaviconUrl);

  if (currentHostname) {
    await loadFaviconPreview(currentHostname);
    await CustomFaviconManager.loadCustomFaviconSection(currentHostname);
    listenForLockedImageChanges(currentHostname);
  }

  const downloadBtn = byID('downloadBtn');
  downloadBtn?.addEventListener('click', () => {
    if (!currentFaviconUrl) return;
    generateFaviconZip(currentFaviconUrl, currentHostname);
  });

  const unlockBtn = byID('unlockBtn');
  unlockBtn?.addEventListener('click', unlockImage);

  const setDefaultBtn = byID<HTMLButtonElement>('setDefaultBtn');
  setDefaultBtn?.addEventListener('click', () => {
    if (!currentFaviconUrl || !currentHostname || !setDefaultBtn) return;
    setupDefaultImage(setDefaultBtn, currentHostname, currentFaviconUrl);
  });

  const removeDefaultBtn = byID('removeDefaultBtn');
  removeDefaultBtn?.addEventListener('click', () => {
    if (!currentHostname) return;
    CustomFaviconManager.removeCustomFavicon(currentHostname, () => {
      showStatus('Default removed');
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
