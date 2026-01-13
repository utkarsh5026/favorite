/**
 * Favicon download management
 * Handles generating and downloading favicon ZIP files
 */

import { byID, downloadImage } from '@/utils';
import { showStatus } from '@/extension';
import { saveFaviconZIP } from '@/favicons';

/**
 * Generates and downloads a ZIP file containing multiple sizes of the favicon
 * @param faviconURL - The URL of the favicon to generate sizes from
 * @param hostname - The hostname to use in the filename, or null to use 'site'
 */
export async function generateFaviconZip(
  faviconURL: string,
  hostname: string | null
): Promise<void> {
  const downloadBtn = byID<HTMLButtonElement>('downloadBtn');
  if (!downloadBtn) return;

  const btnText = downloadBtn.querySelector('span')!;
  const originalText = btnText.textContent;

  downloadBtn.disabled = true;
  downloadBtn.classList.add('loading');
  btnText.textContent = 'Generating...';

  try {
    const img = await downloadImage(faviconURL);
    await saveFaviconZIP(img, faviconURL, hostname || 'site');
    resetBackToNromal(downloadBtn, originalText);
  } catch (error) {
    handleDownloadFailed(downloadBtn, originalText, error as Error);
  }
}

/**
 * Sets up the download button event listener
 * @param getCurrentFaviconUrl - Function to get the current favicon URL
 * @param getCurrentHostname - Function to get the current hostname
 */
export function setupDownloadButton(
  getCurrentFaviconUrl: () => string | null,
  getCurrentHostname: () => string | null
): void {
  const downloadBtn = byID('downloadBtn');
  downloadBtn?.addEventListener('click', () => {
    const url = getCurrentFaviconUrl();
    if (!url) return;
    generateFaviconZip(url, getCurrentHostname());
  });
}

/**
 * Resets the download button to normal state after successful download
 */
function resetBackToNromal(downloadBtn: HTMLButtonElement, originalText: string | null) {
  const btnText = downloadBtn.querySelector('span')!;

  downloadBtn.classList.remove('loading');
  downloadBtn.classList.add('success');
  btnText.textContent = 'Downloaded!';
  showStatus('Downloaded!');

  setTimeout(() => {
    downloadBtn.classList.remove('success');
    btnText.textContent = originalText || 'Download ZIP';
    downloadBtn.disabled = false;
  }, 2000);
}

/**
 * Handles download failure by resetting button state and showing error
 */
function handleDownloadFailed(
  downloadBtn: HTMLButtonElement,
  originalText: string | null,
  error: Error
) {
  const btnText = downloadBtn.querySelector('span')!;
  console.error('Failed to generate favicon ZIP:', error);
  showStatus('Download failed');
  downloadBtn.classList.remove('loading');
  btnText.textContent = originalText || 'Download ZIP';
  downloadBtn.disabled = false;
}
