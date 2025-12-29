import { CONFIG } from './state';
import type { ImageExtractionResult, ImageType } from './types';

/**
 * Extracts the image URL from any type of image element
 */
export function getImageUrl(element: Element): ImageExtractionResult | null {
  return new ImageExtractor(element).getImageUrl();
}

/**
 * Checks if an element is a recognized image element
 */
function isImageElement(element: Element): boolean {
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

class ImageExtractor {
  constructor(private element: Element) {}

  /**
   * Extracts the image URL from any type of image element
   */
  getImageUrl(): ImageExtractionResult | null {
    if (this.element instanceof HTMLImageElement) {
      return this.fromImg(this.element);
    }

    if (this.element instanceof SVGSVGElement) {
      return this.fromSvg(this.element);
    }

    if (this.element instanceof HTMLCanvasElement) {
      return this.fromCanvas(this.element);
    }

    if (this.element instanceof HTMLPictureElement) {
      return this.fromPicture(this.element);
    }

    const bgResult = this.fromBackgroundImage(this.element);
    if (bgResult) {
      return bgResult;
    }

    const nestedImg = this.element.querySelector('img');
    if (nestedImg instanceof HTMLImageElement) {
      return this.fromImg(nestedImg);
    }

    const nestedSvg = this.element.querySelector('svg');
    if (nestedSvg instanceof SVGSVGElement) {
      return this.fromSvg(nestedSvg);
    }

    return this.fromLazyLoadedAttributes(this.element as HTMLElement);
  }

  /**
   * Extracts URL from lazy-loaded attributes
   * Common attributes: data-src, data-lazy-src, data-original
   *
   */
  private fromLazyLoadedAttributes(element: HTMLElement): ImageExtractionResult | null {
    const lazyAttributes = ['src', 'lazySrc', 'original'];

    for (const attr of lazyAttributes) {
      const url = element.dataset?.[attr];
      if (url) {
        return this.createExtractionRes(url, 'img');
      }
    }

    return null;
  }

  /**
   * Extracts URL from an <img> element
   */
  private fromImg(img: HTMLImageElement): ImageExtractionResult | null {
    const url = img.currentSrc || img.src;

    if (url && url !== 'about:blank' && !url.startsWith('data:image/gif;base64,R0lGOD')) {
      return this.createExtractionRes(url, 'img');
    }

    return this.fromLazyLoadedAttributes(img);
  }

  /**
   * Converts inline SVG to data URL
   */
  private fromSvg(svg: SVGSVGElement): ImageExtractionResult | null {
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

      return this.createExtractionRes(`data:image/svg+xml,${encoded}`, 'svg', true);
    } catch (error) {
      console.warn('Image Favicon Preview: Failed to serialize SVG', error);
      return null;
    }
  }

  /**
   * Extracts data URL from canvas element
   */
  private fromCanvas(canvas: HTMLCanvasElement): ImageExtractionResult | null {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl === 'data:,') {
        return null;
      }
      return this.createExtractionRes(dataUrl, 'canvas', true);
    } catch (error) {
      console.warn('Image Favicon Preview: Cannot extract from tainted canvas', error);
      return null;
    }
  }

  /**
   * Extracts URL from <picture> element
   */
  private fromPicture(picture: HTMLPictureElement): ImageExtractionResult | null {
    const source = picture.querySelector('source');
    if (source instanceof HTMLSourceElement && source.srcset) {
      const firstEntry = source.srcset.split(',')[0]?.trim();
      if (!firstEntry) return null;
      const url = firstEntry.split(/\s+/)[0];
      return this.createExtractionRes(url, 'picture');
    }

    const img = picture.querySelector('img');
    if (img) {
      return this.fromImg(img);
    }

    return null;
  }

  /**
   * Extracts URL from CSS background-image
   */
  private fromBackgroundImage(element: Element): ImageExtractionResult | null {
    const computedStyle = window.getComputedStyle(element);
    const bgImage = computedStyle.backgroundImage;

    if (bgImage && bgImage !== 'none') {
      const urlMatch = bgImage.match(/url\(['"]?([^'")\s]+)['"]?\)/);

      if (urlMatch?.[1]) {
        const url = urlMatch[1];
        if (url.startsWith('linear-gradient') || url.startsWith('radial-gradient')) {
          return null;
        }
        return this.createExtractionRes(url, 'background');
      }
    }

    return null;
  }

  /* * Helper to create ImageExtractionResult */
  private createExtractionRes(
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

export class ImageFinder {
  constructor(
    private target: Element,
    private mouseX?: number,
    private mouseY?: number
  ) {}

  /**
   * Finds the image element from an event target, using mouse coordinates to detect
   * the specific image when multiple nested images are present
   */
  find(): Element | null {
    if (isImageElement(this.target)) {
      return this.target;
    }

    if (this.mouseX !== undefined && this.mouseY !== undefined) {
      const el = this.detectFromCoordinates();
      if (el) return el;
    }

    const selector = CONFIG.imageSelectors.join(', ');
    const matched = this.target.closest(selector);

    if (matched) {
      if (isImageElement(matched) || hasBackgroundImage(matched)) {
        return matched;
      }

      const nested = this.getAllNestedImages(matched);
      if (nested.length > 0) return nested[0];

      return matched;
    }

    const el = this.findNestedImageElement(this.target);
    if (el) return el;
    return null;
  }

  /**
   * Gets all nested image elements within a container
   */
  private getAllNestedImages(container: Element): Element[] {
    const elements = container.querySelectorAll('img, svg, canvas, picture, *');
    return Array.from(elements).filter((el) => isImageElement(el));
  }

  private detectFromCoordinates(): Element | null {
    let current: Element | null = this.target;
    let level = 0;

    while (current && current !== document.body && level < 8) {
      level++;
      console.log(`[Coordinate Detection] Level ${level}, checking:`, current);

      if (isImageElement(current) && this.coversCoordinates(current)) {
        return current;
      }

      const imgs = this.getAllNestedImages(current);

      if (imgs.length > 0) {
        const imageAtCoords = this.getImageAtCoordinates(imgs);
        if (imageAtCoords) {
          return imageAtCoords;
        }
      }

      current = current.parentElement;
    }

    console.log('[Coordinate Detection] ✗ No image found at coordinates');
    return null;
  }

  /**
   * Finds the specific image element at the given coordinates
   * Returns the smallest (most specific) image that contains the coordinates
   */
  private getImageAtCoordinates(images: Element[]): Element | null {
    let bestMatch: Element | null = null;
    let smallestArea = Infinity;
    const x = this.mouseX!;
    const y = this.mouseY!;
    let matchCount = 0;

    for (const image of images) {
      const rect = image.getBoundingClientRect();
      const isMatch = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      if (!isMatch) continue;

      matchCount++;
      const area = rect.width * rect.height;
      if (area < smallestArea) {
        smallestArea = area;
        bestMatch = image;
      }
    }

    if (matchCount > 0) {
      console.log(
        `[Coordinate Match] Found ${matchCount} matching images, selected smallest (area: ${smallestArea.toFixed(0)}):`,
        bestMatch
      );
    }

    return bestMatch;
  }

  private coversCoordinates(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      this.mouseX! >= rect.left &&
      this.mouseX! <= rect.right &&
      this.mouseY! >= rect.top &&
      this.mouseY! <= rect.bottom
    );
  }

  /**
   * Searches within an element for nested images, including background-image styles
   */
  private findNestedImageElement(container: Element): Element | null {
    const img = container.querySelector('img, svg, canvas, picture');
    if (img && isImageElement(img)) {
      return img;
    }
    return Array.from(container.querySelectorAll('*')).find(hasBackgroundImage) || null;
  }
}
