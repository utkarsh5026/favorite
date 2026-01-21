import JSZip from 'jszip';
import { resizeImageToBlob } from '@/images';

const FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const;

/**
 * Generates and downloads a ZIP file containing the favicon in multiple sizes
 * @param img - The HTML image element containing the favicon
 * @param faviconURL - The URL of the original favicon
 * @param hostname - The hostname to use for the ZIP filename
 */
export async function saveFaviconZIP(
  img: HTMLImageElement,
  faviconURL: string,
  hostname: string
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('favicons');

  if (!folder) {
    throw new Error('Failed to create folder in ZIP');
  }

  for (const size of FAVICON_SIZES) {
    try {
      const blob = await resizeImageToBlob(img, size);
      const name = `favicon-${size}x${size}.png`;
      folder.file(name, blob);
    } catch (error) {
      console.warn(`Failed to generate ${size}x${size}:`, error);
    }
  }

  const original = await fetch(faviconURL);
  const originalBlob = await original.blob();
  const extension = faviconURL.endsWith('.ico') ? 'ico' : 'png';
  folder.file(`favicon-original.${extension}`, originalBlob);

  const content = await zip.generateAsync({ type: 'blob' });
  downloadZip(content, hostname);
}

/**
 * Downloads a ZIP file by creating a temporary download link
 * @param content - The blob content of the ZIP file
 * @param hostname - The hostname to use in the filename
 */
function downloadZip(content: Blob, hostname: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `favicons-${hostname}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
