import { CONFIG } from './state';
import type { ImageExtractionResult } from './types';

/**
 * Extracts the image URL from any type of image element
 */
export function getImageUrl(element: Element): ImageExtractionResult | null {
  if (element instanceof HTMLImageElement) {
    return extractFromImg(element);
  }

  if (element instanceof SVGSVGElement) {
    return extractFromSvg(element);
  }

  if (element instanceof HTMLCanvasElement) {
    return extractFromCanvas(element);
  }

  if (element instanceof HTMLPictureElement) {
    return extractFromPicture(element);
  }

  const bgResult = extractFromBackgroundImage(element);
  if (bgResult) {
    return bgResult;
  }

  const nestedImg = element.querySelector('img');
  if (nestedImg) {
    return extractFromImg(nestedImg);
  }

  const nestedSvg = element.querySelector('svg');
  if (nestedSvg instanceof SVGSVGElement) {
    return extractFromSvg(nestedSvg);
  }

  const htmlElement = element as HTMLElement;
  if (htmlElement.dataset?.src) {
    return { url: htmlElement.dataset.src, type: 'img', isDataUrl: false };
  }
  if (htmlElement.dataset?.lazySrc) {
    return { url: htmlElement.dataset.lazySrc, type: 'img', isDataUrl: false };
  }
  if (htmlElement.dataset?.original) {
    return { url: htmlElement.dataset.original, type: 'img', isDataUrl: false };
  }

  return null;
}

/**
 * Extracts URL from an <img> element
 */
function extractFromImg(img: HTMLImageElement): ImageExtractionResult | null {
  const url = img.currentSrc || img.src;

  if (url && url !== 'about:blank' && !url.startsWith('data:image/gif;base64,R0lGOD')) {
    return {
      url,
      type: 'img',
      isDataUrl: url.startsWith('data:')
    };
  }

  if (img.dataset.src) {
    return { url: img.dataset.src, type: 'img', isDataUrl: false };
  }
  if (img.dataset.lazySrc) {
    return { url: img.dataset.lazySrc, type: 'img', isDataUrl: false };
  }

  return null;
}

/**
 * Converts inline SVG to data URL
 */
function extractFromSvg(svg: SVGSVGElement): ImageExtractionResult | null {
  try {
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    if (!clonedSvg.hasAttribute('width') || !clonedSvg.hasAttribute('height')) {
      const rect = svg.getBoundingClientRect();
      clonedSvg.setAttribute('width', String(rect.width || 32));
      clonedSvg.setAttribute('height', String(rect.height || 32));
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const encoded = encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');

    const dataUrl = `data:image/svg+xml,${encoded}`;

    return {
      url: dataUrl,
      type: 'svg',
      isDataUrl: true
    };
  } catch (error) {
    console.warn('Image Favicon Preview: Failed to serialize SVG', error);
    return null;
  }
}

/**
 * Extracts data URL from canvas element
 */
function extractFromCanvas(canvas: HTMLCanvasElement): ImageExtractionResult | null {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl === 'data:,') {
      return null;
    }
    return {
      url: dataUrl,
      type: 'canvas',
      isDataUrl: true
    };
  } catch (error) {
    console.warn('Image Favicon Preview: Cannot extract from tainted canvas', error);
    return null;
  }
}

/**
 * Extracts URL from <picture> element
 */
function extractFromPicture(picture: HTMLPictureElement): ImageExtractionResult | null {
  const source = picture.querySelector('source');
  if (source instanceof HTMLSourceElement && source.srcset) {
    const firstUrl = parseSrcset(source.srcset);
    if (firstUrl) {
      return { url: firstUrl, type: 'picture', isDataUrl: false };
    }
  }

  const img = picture.querySelector('img');
  if (img) {
    return extractFromImg(img);
  }

  return null;
}

/**
 * Extracts URL from CSS background-image
 */
function extractFromBackgroundImage(element: Element): ImageExtractionResult | null {
  const computedStyle = window.getComputedStyle(element);
  const bgImage = computedStyle.backgroundImage;

  if (bgImage && bgImage !== 'none') {
    const urlMatch = bgImage.match(/url\(['"]?([^'")\s]+)['"]?\)/);

    if (urlMatch?.[1]) {
      const url = urlMatch[1];
      if (url.startsWith('linear-gradient') || url.startsWith('radial-gradient')) {
        return null;
      }
      return {
        url,
        type: 'background',
        isDataUrl: url.startsWith('data:')
      };
    }
  }

  return null;
}

/**
 * Parses srcset attribute and returns the first URL
 */
function parseSrcset(srcset: string): string | null {
  const firstEntry = srcset.split(',')[0]?.trim();
  if (!firstEntry) return null;
  const url = firstEntry.split(/\s+/)[0];
  return url || null;
}

/**
 * Finds the image element from an event target
 */
export function findImageElement(target: Element): Element | null {
  if (isImageElement(target)) {
    return target;
  }

  const selector = CONFIG.imageSelectors.join(', ');
  const matched = target.closest(selector);

  if (matched) {
    if (isImageElement(matched)) {
      return matched;
    }
    if (hasBackgroundImage(matched)) {
      return matched;
    }
    const nestedImg = matched.querySelector('img, svg, canvas, picture');
    if (nestedImg && isImageElement(nestedImg)) {
      return nestedImg;
    }
    return matched;
  }

  let current: Element | null = target;
  while (current && current !== document.body) {
    if (hasBackgroundImage(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Checks if an element is a recognized image element
 */
export function isImageElement(element: Element): boolean {
  return (
    element instanceof HTMLImageElement ||
    element instanceof SVGSVGElement ||
    element instanceof HTMLCanvasElement ||
    element instanceof HTMLPictureElement ||
    hasBackgroundImage(element)
  );
}

/**
 * Checks if an element has a CSS background-image
 */
export function hasBackgroundImage(element: Element): boolean {
  const bgImage = window.getComputedStyle(element).backgroundImage;
  if (!bgImage || bgImage === 'none' || bgImage === '') {
    return false;
  }
  return !bgImage.startsWith('linear-gradient') && !bgImage.startsWith('radial-gradient');
}
