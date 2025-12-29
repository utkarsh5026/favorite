/**
 * Gets an HTML element by its ID with type safety
 * @param id - The ID of the element to retrieve
 * @returns The element cast to the specified type, or null if not found
 */
export function byID<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Downloads an image from a URL and returns it as an HTMLImageElement
 * @param url - The URL of the image to download
 * @returns Promise that resolves to the loaded image element
 * @throws Error if the image fails to load
 */
export async function downloadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });

  return img;
}

/**
 * Downloads a ZIP file by creating a temporary download link
 * @param content - The blob content of the ZIP file
 * @param hostname - The hostname to use in the filename
 */
export function downloadZip(content: Blob, hostname: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `favicons-${hostname}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Creates and configures a canvas element with specified dimensions
 * @param width - The width of the canvas in pixels
 * @param height - The height of the canvas in pixels
 * @returns The configured canvas element
 */
export function setupCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
