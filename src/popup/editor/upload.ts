import { byID, setActive } from '@/utils';
import { showStatus } from '@/extension';

export function setupUpload(onFileUrl: (dataUrl: string) => Promise<void>) {
  const uploadZone = byID('editorUploadZone');
  const uploadInput = byID<HTMLInputElement>('editorUploadInput');

  if (!uploadZone || !uploadInput) return;

  uploadZone.addEventListener('click', () => {
    uploadInput.click();
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    setActive(uploadZone, true);
    uploadZone.classList.add('drag-over'); // Keep for specificity
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleUploadFile(files[0], onFileUrl);
    }
  });

  uploadInput.addEventListener('change', () => {
    if (uploadInput.files && uploadInput.files.length > 0) {
      handleUploadFile(uploadInput.files[0], onFileUrl);
    }
  });
}

function handleUploadFile(file: File, onFileUrl: (dataUrl: string) => Promise<void>) {
  if (!file.type.startsWith('image/')) {
    showStatus('Please select an image file');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showStatus('File too large (max 5MB)');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target?.result as string;
    if (dataUrl) {
      await onFileUrl(dataUrl);
    }
  };
  reader.readAsDataURL(file);
}
