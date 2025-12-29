import { CONFIG } from './state';
import type { ImageExtractionResult, ImageType } from './types';
import { all } from './utils';

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
  private mouseX: number;
  private mouseY: number;
  private target: Element;

  constructor(target: Element, mouseX?: number, mouseY?: number) {
    this.target = target;
    this.mouseX = mouseX ?? 0;
    this.mouseY = mouseY ?? 0;
  }

  find(): Element | null {
    if (this.mouseX && this.mouseY) {
      const found = this.findByVisualStack();
      if (found) return found;
    }

    return this.findByDOMTraversal();
  }

  /**
   * Use the browser's visual stacking order
   * This handles z-index, transforms, positioning automatically
   */
  private findByVisualStack(): Element | null {
    const stack = document.elementsFromPoint(this.mouseX, this.mouseY);
    const imageFinders = [
      (el: Element) => this.isImageElement(el) && this.isVisible(el),
      (el: Element) => this.hasBackgroundImage(el) && this.isVisible(el),
      (el: Element) => this.hasPseudoElementImage(el),
    ];

    for (const finder of imageFinders) {
      const img = stack.find(finder);
      if (img) return img;
    }

    return null;
  }

  /**
   * DOM traversal when coordinates unavailable
   */
  private findByDOMTraversal(): Element | null {
    const targetIsImage = this.isImageElement(this.target);
    if (targetIsImage) return this.target;

    const descendant = this.findImageDescendant(this.target);
    if (descendant) return descendant;

    let current = this.target.parentElement;
    let depth = 0;
    while (current && depth < 5) {
      const isImg = this.isImageElement(current);
      const hasBg = this.hasBackgroundImage(current);

      if (isImg || hasBg) {
        return current;
      }

      const siblingImage = this.findImageDescendant(current);
      if (siblingImage) {
        return siblingImage;
      }

      current = current.parentElement;
      depth++;
    }

    return null;
  }

  /**
   * Find first image descendant using efficient selectors
   */
  private findImageDescendant(container: Element): Element | null {
    const directImages = all(CONFIG.imageSelectors.join(','), container);
    const visible = directImages.find((el) => this.isVisible(el));
    if (visible) {
      return visible;
    }

    const background = all('*', container).find((el) => {
      return this.hasBackgroundImage(el) && this.isVisible(el);
    });

    return background || null;
  }

  private isImageElement(el: Element): boolean {
    const tagName = el.tagName.toLowerCase();
    if (['img', 'svg', 'canvas', 'picture', 'video'].includes(tagName)) {
      return true;
    }

    return (
      tagName.includes('image') || tagName.includes('img') || el.getAttribute('role') === 'img'
    );
  }

  private hasBackgroundImage(el: Element): boolean {
    const style = getComputedStyle(el);
    const bg = style.backgroundImage;

    if (!bg || bg === 'none') return false;
    return bg.includes('url(');
  }

  private hasPseudoElementImage(el: Element): boolean {
    const pseudos = ['::before', '::after'] as const;

    const parse = (s: string) => {
      return parseFloat(s) || 0;
    };

    return pseudos.some((pseudo) => {
      try {
        const style = getComputedStyle(el, pseudo);
        const bg = style.backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url(')) {
          return parse(style.width) > 0 && parse(style.height) > 0;
        }
      } catch (e) {}
    });
  }

  private isVisible(el: Element): boolean {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity) === 0 ||
      rect.width === 0 ||
      rect.height === 0
    ) {
      return false;
    }

    return true;
  }
}
