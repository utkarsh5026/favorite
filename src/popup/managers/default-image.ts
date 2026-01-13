/**
 * Default favicon management
 * Handles setting custom favicons as defaults for specific hostnames
 */

import { showStatus } from '@/extension';
import { setCustomFavicon } from '@/favicons';

/**
 * Sets up and executes setting a custom favicon as the default for a hostname
 * @param btn - The button element triggering the action
 * @param hostname - The hostname to set the default favicon for
 * @param faviconURL - The URL of the favicon to set as default
 */
function setupDefaultImage(btn: HTMLButtonElement, hostname: string, faviconURL: string) {
  const btnText = btn.querySelector('span')!;
  const originalText = btnText.textContent;

  btn.disabled = true;
  btn.classList.add('loading');
  btnText.textContent = 'Setting...';

  const onSuccess = () => {
    btn.classList.remove('loading');
    btn.classList.add('success');
    btnText.textContent = 'Done!';
    showStatus('Set as default!');

    setTimeout(() => {
      btn.classList.remove('success');
      btnText.textContent = originalText || 'Set Default';
      btn.disabled = false;
    }, 2000);
  };

  setCustomFavicon(hostname, faviconURL, onSuccess);
}

/**
 * Sets up the set default button event listener
 * @param getCurrentFaviconUrl - Function to get the current favicon URL
 * @param getCurrentHostname - Function to get the current hostname
 */
export function setupDefaultImageButton(
  getCurrentFaviconUrl: () => string | null,
  getCurrentHostname: () => string | null
): void {
  const setDefaultBtn = document.getElementById('setDefaultBtn') as HTMLButtonElement | null;
  setDefaultBtn?.addEventListener('click', () => {
    const url = getCurrentFaviconUrl();
    const hostname = getCurrentHostname();
    if (!url || !hostname || !setDefaultBtn) return;
    setupDefaultImage(setDefaultBtn, hostname, url);
  });
}
