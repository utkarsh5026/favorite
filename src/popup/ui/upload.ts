/**
 * Upload zone UI
 * Handles image upload with drag-drop and file input
 */

import { byID, getActiveTab, setActive, setVisible } from '@/utils';
import { loadSettings } from '@/extension';
import { showStatus } from '@/extension';
import { setCustomFavicon } from '@/favicons';
import { processFile, applyShapeAndPreview } from '@/images/upload';

// Store the current uploaded image URL
let currentUploadedUrl: string | null = null;

/**
 * Sets up the upload zone with drag-drop and file input handlers
 */
export function setupUploadZone(hostname: string | null): void {
  const uploadZone = byID('uploadZone');
  const uploadInput = byID<HTMLInputElement>('uploadInput');

  if (!uploadZone || !uploadInput) return;

  uploadZone.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('.upload-preview-actions') || target.closest('.upload-preview img')) {
      return;
    }
    uploadInput.click();
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    setActive(uploadZone, true);
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');

    const file = e.dataTransfer?.files[0];
    if (file) await handleFileUpload(file);
  });

  uploadInput.addEventListener('change', async () => {
    const file = uploadInput.files?.[0];
    if (file) await handleFileUpload(file);
    uploadInput.value = '';
  });

  byID('uploadApplyBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyUploadedImage(hostname);
  });

  byID('uploadDefaultBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setUploadedAsDefault(hostname);
  });

  byID('uploadCancelBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    cancelUpload();
  });
}

/**
 * Handles a file upload and shows preview
 */
async function handleFileUpload(file: File): Promise<void> {
  const result = await processFile(file);

  if (!result.success) {
    showStatus(result.error || 'Upload failed');
    return;
  }

  currentUploadedUrl = result.dataUrl!;

  const settings = await loadSettings();
  const previewUrl = await applyShapeAndPreview(currentUploadedUrl, settings.faviconShape);

  const uploadPreviewImage = byID<HTMLImageElement>('uploadPreviewImage');
  const uploadPreview = byID('uploadPreview');
  const uploadContent = byID('uploadContent');

  if (uploadPreviewImage && uploadPreview) {
    uploadPreviewImage.src = previewUrl;
    setActive(uploadPreview, true);
    uploadPreview.classList.add('visible'); // Keep for animation
    setVisible(uploadContent, false);
  }
}

/**
 * Applies the uploaded image as the current favicon
 */
async function applyUploadedImage(hostname: string | null): Promise<void> {
  if (!currentUploadedUrl) return;

  const tab = await getActiveTab();
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, {
    type: 'contextMenuAction',
    action: 'preview',
    imageUrl: currentUploadedUrl,
    hostname: hostname || '',
  });

  showStatus('Applied!');
}

/**
 * Sets the uploaded image as the default favicon for the site
 */
async function setUploadedAsDefault(hostname: string | null): Promise<void> {
  if (!currentUploadedUrl || !hostname) return;

  await setCustomFavicon(hostname, currentUploadedUrl, () => {
    showStatus('Set as default!');
  });
}

/**
 * Cancels the current upload and resets the UI
 */
function cancelUpload(): void {
  currentUploadedUrl = null;
  const uploadPreview = byID('uploadPreview');
  const uploadContent = byID('uploadContent');

  setActive(uploadPreview, false);
  uploadPreview?.classList.remove('visible'); // Keep for animation
  setVisible(uploadContent, true);
}
