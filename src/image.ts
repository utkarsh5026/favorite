import { CONFIG } from './state';
import type { ImageExtractionResult } from './types';
import { all } from './utils';
import { extractImageData } from './images';

/**
 * Extracts the image URL from any type of image element
 */
export function getImageUrl(element: Element): ImageExtractionResult | null {
  return extractImageData(element);
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

/**
 * Finds image elements within the DOM using visual stacking order or DOM traversal.
 * Supports various image types including img tags, background images, SVG, canvas, and pseudo-elements.
 */
export class ImageFinder {
  private mouseX: number;
  private mouseY: number;
  private target: Element;

  /**
   * Creates an ImageFinder instance
   * @param target - The target element to search from
   * @param mouseX - Optional X coordinate of mouse position for visual stack search
   * @param mouseY - Optional Y coordinate of mouse position for visual stack search
   */
  constructor(target: Element, mouseX?: number, mouseY?: number) {
    this.target = target;
    this.mouseX = mouseX ?? 0;
    this.mouseY = mouseY ?? 0;
  }

  /**
   * Finds an image element using the most appropriate strategy.
   * Prefers visual stack search when mouse coordinates are available,
   * falls back to DOM traversal otherwise.
   * @returns The found image element, or null if none found
   */
  find(): Element | null {
    if (this.mouseX && this.mouseY) {
      const found = this.findByVisualStack();
      if (found) return found;
    }

    return this.findByDOMTraversal();
  }

  /**
   * Uses the browser's visual stacking order to find images at mouse coordinates.
   * This method handles z-index, transforms, and positioning automatically.
   * Checks for img elements, background images, and pseudo-element images in order.
   * @returns The topmost visible image element at the mouse position, or null if none found
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
   * Traverses the DOM to find image elements when mouse coordinates are unavailable.
   * Searches in order: target element, descendants, ancestors (up to 5 levels), and siblings.
   * @returns The found image element, or null if none found within search depth
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
   * Finds the first visible image descendant within a container element.
   * Uses efficient selectors to check direct images first, then background images.
   * @param container - The container element to search within
   * @returns The first visible image descendant, or null if none found
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

  /**
   * Checks if an element is recognized as an image element.
   * Includes standard image tags and elements with image-related attributes.
   * @param el - The element to check
   * @returns True if the element is an image element, false otherwise
   */
  private isImageElement(el: Element): boolean {
    const tagName = el.tagName.toLowerCase();
    if (['img', 'svg', 'canvas', 'picture', 'video'].includes(tagName)) {
      return true;
    }

    return (
      tagName.includes('image') || tagName.includes('img') || el.getAttribute('role') === 'img'
    );
  }

  /**
   * Checks if an element has a CSS background-image with a URL.
   * Excludes gradients and empty values.
   * @param el - The element to check
   * @returns True if the element has a background image URL, false otherwise
   */
  private hasBackgroundImage(el: Element): boolean {
    const style = getComputedStyle(el);
    const bg = style.backgroundImage;

    if (!bg || bg === 'none') return false;
    return bg.includes('url(');
  }

  /**
   * Checks if an element has a visible background image on its pseudo-elements (::before or ::after).
   * Validates that the pseudo-element has non-zero dimensions.
   * @param el - The element to check for pseudo-element images
   * @returns True if any pseudo-element has a visible background image, false otherwise
   */
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

  /**
   * Checks if an element is visible in the viewport.
   * Considers display, visibility, opacity, and element dimensions.
   * @param el - The element to check for visibility
   * @returns True if the element is visible, false otherwise
   */
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
