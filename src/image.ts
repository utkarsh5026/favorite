import { CONFIG } from './state';
import type { ImageExtractionResult, ImageType } from './types';

/**
 * Extracts the image URL from any type of image element
 */
export function getImageUrl(element: Element): ImageExtractionResult | null {
  if (element instanceof HTMLImageElement) {
    return fromImg(element);
  }

  if (element instanceof SVGSVGElement) {
    return fromSvg(element);
  }

  if (element instanceof HTMLCanvasElement) {
    return fromCanvas(element);
  }

  if (element instanceof HTMLPictureElement) {
    return fromPicture(element);
  }

  const bgResult = fromBackgroundImage(element);
  if (bgResult) {
    return bgResult;
  }

  const nestedImg = element.querySelector('img');
  if (nestedImg instanceof HTMLImageElement) {
    return fromImg(nestedImg);
  }

  const nestedSvg = element.querySelector('svg');
  if (nestedSvg instanceof SVGSVGElement) {
    return fromSvg(nestedSvg);
  }

  return fromLazyLoadedAttributes(element as HTMLElement);
}

/**
 * Extracts URL from lazy-loaded attributes
 * Common attributes: data-src, data-lazy-src, data-original
 *
 */
function fromLazyLoadedAttributes(element: HTMLElement): ImageExtractionResult | null {
  const lazyAttributes = ['src', 'lazySrc', 'original'];

  for (const attr of lazyAttributes) {
    const url = element.dataset?.[attr];
    if (url) {
      return createExtractionRes(url, 'img');
    }
  }

  return null;
}

/**
 * Extracts URL from an <img> element
 */
function fromImg(img: HTMLImageElement): ImageExtractionResult | null {
  const url = img.currentSrc || img.src;

  if (url && url !== 'about:blank' && !url.startsWith('data:image/gif;base64,R0lGOD')) {
    return createExtractionRes(url, 'img');
  }

  return fromLazyLoadedAttributes(img);
}

/**
 * Converts inline SVG to data URL
 */
function fromSvg(svg: SVGSVGElement): ImageExtractionResult | null {
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
    const encoded = encodeURIComponent(svgString).replace(/'/g, '%27').replace(/"/g, '%22');

    return createExtractionRes(`data:image/svg+xml,${encoded}`, 'svg', true);
  } catch (error) {
    console.warn('Image Favicon Preview: Failed to serialize SVG', error);
    return null;
  }
}

/**
 * Extracts data URL from canvas element
 */
function fromCanvas(canvas: HTMLCanvasElement): ImageExtractionResult | null {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl === 'data:,') {
      return null;
    }
    return createExtractionRes(dataUrl, 'canvas', true);
  } catch (error) {
    console.warn('Image Favicon Preview: Cannot extract from tainted canvas', error);
    return null;
  }
}

/**
 * Extracts URL from <picture> element
 */
function fromPicture(picture: HTMLPictureElement): ImageExtractionResult | null {
  const source = picture.querySelector('source');
  if (source instanceof HTMLSourceElement && source.srcset) {
    const firstUrl = parseSrcset(source.srcset);
    if (firstUrl) {
      return createExtractionRes(firstUrl, 'picture');
    }
  }

  const img = picture.querySelector('img');
  if (img) {
    return fromImg(img);
  }

  return null;
}

/**
 * Extracts URL from CSS background-image
 */
function fromBackgroundImage(element: Element): ImageExtractionResult | null {
  const computedStyle = window.getComputedStyle(element);
  const bgImage = computedStyle.backgroundImage;

  if (bgImage && bgImage !== 'none') {
    const urlMatch = bgImage.match(/url\(['"]?([^'")\s]+)['"]?\)/);

    if (urlMatch?.[1]) {
      const url = urlMatch[1];
      if (url.startsWith('linear-gradient') || url.startsWith('radial-gradient')) {
        return null;
      }
      return createExtractionRes(url, 'background');
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
    if (isImageElement(matched) || hasBackgroundImage(matched)) {
      return matched;
    }

    const nestedImg = matched.querySelector('img, svg, canvas, picture');
    if (nestedImg && isImageElement(nestedImg)) {
      return nestedImg;
    }
    return matched;
  }

  const nestedImageElement = findNestedImageElement(target);
  if (nestedImageElement) {
    return nestedImageElement;
  }

  let current: Element | null = target;
  while (current && current !== document.body) {
    if (hasBackgroundImage(current)) {
      return current;
    }
    const nestedInAncestor = findNestedImageElement(current);
    if (nestedInAncestor) {
      return nestedInAncestor;
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Searches within an element for nested images, including background-image styles
 */
function findNestedImageElement(container: Element): Element | null {
  const img = container.querySelector('img, svg, canvas, picture');
  if (img && isImageElement(img)) {
    return img;
  }

  return Array.from(container.querySelectorAll('*')).find(hasBackgroundImage) || null;
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

/* * Helper to create ImageExtractionResult */
function createExtractionRes(
  url: string,
  type: ImageType,
  isDataUrl?: boolean
): ImageExtractionResult {
  return {
    url,
    type,
    isDataUrl: isDataUrl === undefined ? url.startsWith('data:') : isDataUrl,
  };
}

export async function resizeImage(img: HTMLImageElement, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, size, size);

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}
