import JSZip from 'jszip';
import { resizeImageToBlob } from '@/images';

// Map of sizes to their standard filenames for complete favicon package
const FAVICON_CONFIG = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
  { size: 150, name: 'mstile-150x150.png' },
] as const;

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

  for (const { size, name } of FAVICON_CONFIG) {
    try {
      const blob = await resizeImageToBlob(img, size);
      folder.file(name, blob);
    } catch (error) {
      console.warn(`Failed to generate ${name}:`, error);
    }
  }

  try {
    const icoBlob = await resizeImageToBlob(img, 32);
    folder.file('favicon.ico', icoBlob);
  } catch (error) {
    console.warn('Failed to generate favicon.ico:', error);
  }


  const original = await fetch(faviconURL);
  const originalBlob = await original.blob();
  const extension = faviconURL.endsWith('.ico') ? 'ico' : 'png';
  folder.file(`favicon-original.${extension}`, originalBlob);

  const manifest = generateWebManifest(hostname);
  folder.file('site.webmanifest', JSON.stringify(manifest, null, 2));

  const browserConfig = generateBrowserConfig();
  folder.file('browserconfig.xml', browserConfig);

  const htmlSnippet = generateHTMLSnippet();
  folder.file('HTML_SNIPPET.txt', htmlSnippet);

  const content = await zip.generateAsync({ type: 'blob' });
  downloadZip(content, hostname);
}

/**
 * Generates a web manifest file for PWA support
 * @param hostname - The hostname to use as the app name
 */
function generateWebManifest(hostname: string) {
  return {
    name: hostname,
    short_name: hostname,
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
  };
}

/**
 * Generates browserconfig.xml for Windows tiles
 */
function generateBrowserConfig(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="/mstile-150x150.png"/>
            <TileColor>#da532c</TileColor>
        </tile>
    </msapplication>
</browserconfig>`;
}

/**
 * Generates HTML snippet with all necessary favicon links
 */
function generateHTMLSnippet(): string {
  return `<!-- Favicon Package - Add these tags to your <head> section -->

<!-- Standard favicons -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- Android Chrome -->
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">

<!-- Web App Manifest -->
<link rel="manifest" href="/site.webmanifest">

<!-- Microsoft Tiles -->
<meta name="msapplication-TileColor" content="#da532c">
<meta name="msapplication-TileImage" content="/mstile-150x150.png">
<meta name="msapplication-config" content="/browserconfig.xml">

<!-- Theme Color -->
<meta name="theme-color" content="#ffffff">

<!--
  INSTALLATION INSTRUCTIONS:
  1. Extract all files from the ZIP to your React app's 'public' folder
  2. Copy the HTML snippet above into your public/index.html <head> section
  3. Update the theme_color and TileColor values to match your brand colors
  4. Edit site.webmanifest to customize your app name and colors
-->`;
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
