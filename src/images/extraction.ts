import { ImageExtractionResult, ImageType } from './types';

/**
 * Helper to create ImageExtractionResult
 */
function res(url: string, type: ImageType, isDataUrl?: boolean): ImageExtractionResult {
  return {
    url,
    type,
    isDataUrl: isDataUrl === undefined ? url.startsWith('data:') : isDataUrl,
  };
}

/**
 * Extracts URL from lazy-loaded attributes
 * Common attributes: data-src, data-lazy-src, data-original
 */
function fromLazyLoadedAttributes(element: HTMLElement): ImageExtractionResult | null {
  const lazyAttributes = ['src', 'lazySrc', 'original'];

  for (const attr of lazyAttributes) {
    const url = element.dataset?.[attr];
    if (url) {
      return res(url, 'img');
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
    return res(url, 'img');
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

    return res(`data:image/svg+xml,${encoded}`, 'svg', true);
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
    return res(dataUrl, 'canvas', true);
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
    const firstEntry = source.srcset.split(',')[0]?.trim();
    if (!firstEntry) return null;
    const url = firstEntry.split(/\s+/)[0];
    return res(url, 'picture');
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
      return res(url, 'background');
    }
  }

  return null;
}

/**
 * Extracts the image URL from any type of image element
 */
export function extractImageData(element: Element): ImageExtractionResult | null {
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
