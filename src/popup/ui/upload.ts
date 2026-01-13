/**
 * Upload zone UI
 * Handles image upload with drag-drop and file input
 */

import { byID } from '@/utils';
import { loadSettings } from '@/extension';
import { showStatus } from '@/extension';
import { HistoryManager } from '@/history';
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

  // Click to upload (only on content area, not on preview actions)
  uploadZone.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('.upload-preview-actions') || target.closest('.upload-preview img')) {
      return;
    }
    uploadInput.click();
  });

  // Drag and drop handlers
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
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

  // File input change handler
  uploadInput.addEventListener('change', async () => {
    const file = uploadInput.files?.[0];
    if (file) await handleFileUpload(file);
    uploadInput.value = ''; // Reset for same file re-upload
  });

  // Action buttons
  byID('uploadApplyBtn')?.addEventListener('click', () => applyUploadedImage(hostname));
  byID('uploadDefaultBtn')?.addEventListener('click', () => setUploadedAsDefault(hostname));
  byID('uploadCancelBtn')?.addEventListener('click', cancelUpload);
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
    uploadPreview.classList.add('visible');
    uploadContent?.classList.add('hidden');
  }
}

/**
 * Applies the uploaded image as the current favicon
 */
async function applyUploadedImage(hostname: string | null): Promise<void> {
  if (!currentUploadedUrl) return;

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, {
    type: 'contextMenuAction',
    action: 'preview',
    imageUrl: currentUploadedUrl,
    hostname: hostname || '',
  });

  // Record in history
  if (hostname) {
    await HistoryManager.addEntry(hostname, currentUploadedUrl, 'upload');
  }

  showStatus('Applied!');
  cancelUpload();
}

/**
 * Sets the uploaded image as the default favicon for the site
 */
async function setUploadedAsDefault(hostname: string | null): Promise<void> {
  if (!currentUploadedUrl || !hostname) return;

  await setCustomFavicon(hostname, currentUploadedUrl, () => {
    showStatus('Set as default!');
    cancelUpload();
  });

  await HistoryManager.addEntry(hostname, currentUploadedUrl, 'upload');
}

/**
 * Cancels the current upload and resets the UI
 */
function cancelUpload(): void {
  currentUploadedUrl = null;
  const uploadPreview = byID('uploadPreview');
  const uploadContent = byID('uploadContent');

  uploadPreview?.classList.remove('visible');
  uploadContent?.classList.remove('hidden');
}
