import { all } from '../utils';
import { CONFIG } from '../state';

const DOM_TRAVERSAL_DEPTH = 5;

/**
 * Checks if an element is recognized as an image element.
 * Includes standard image tags and elements with image-related attributes.
 */
function isImageElement(el: Element): boolean {
  const tagName = el.tagName.toLowerCase();
  if (['img', 'svg', 'canvas', 'picture', 'video'].includes(tagName)) {
    return true;
  }

  return tagName.includes('image') || tagName.includes('img') || el.getAttribute('role') === 'img';
}

/**
 * Checks if an element has a CSS background-image with a URL.
 * Excludes gradients and empty values.
 */
function hasBackgroundImage(el: Element): boolean {
  const style = getComputedStyle(el);
  const bg = style.backgroundImage;

  if (!bg || bg === 'none') return false;
  return bg.includes('url(');
}

/**
 * Checks if an element is visible in the viewport.
 * Considers display, visibility, opacity, and element dimensions.
 */
function isVisible(el: Element): boolean {
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

/**
 * Checks if an element has a visible background image on its pseudo-elements (::before or ::after).
 * Validates that the pseudo-element has non-zero dimensions.
 */
function hasPseudoElementImage(el: Element): boolean {
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
 * Finds the first visible image descendant within a container element.
 * Uses efficient selectors to check direct images first, then background images.
 */
function findImageDescendant(container: Element): Element | null {
  const directImages = all(CONFIG.imageSelectors.join(','), container);
  const visible = directImages.find((el) => isVisible(el));
  if (visible) {
    return visible;
  }

  const background = all('*', container).find((el) => {
    return hasBackgroundImage(el) && isVisible(el);
  });

  return background || null;
}

/**
 * Uses the browser's visual stacking order to find images at mouse coordinates.
 * This method handles z-index, transforms, and positioning automatically.
 * Checks for img elements, background images, and pseudo-element images in order.
 */
function findByVisualStack(mouseX: number, mouseY: number): Element | null {
  const stack = document.elementsFromPoint(mouseX, mouseY);
  const imageFinders = [
    (el: Element) => isImageElement(el) && isVisible(el),
    (el: Element) => hasBackgroundImage(el) && isVisible(el),
    (el: Element) => hasPseudoElementImage(el),
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
 */
function findByDOMTraversal(target: Element): Element | null {
  const targetIsImage = isImageElement(target);
  if (targetIsImage) return target;

  const descendant = findImageDescendant(target);
  if (descendant) return descendant;

  let current = target.parentElement;
  let depth = 0;
  while (current && depth < DOM_TRAVERSAL_DEPTH) {
    if (isImageElement(current) || hasBackgroundImage(current)) {
      return current;
    }

    const siblingImage = findImageDescendant(current);
    if (siblingImage) {
      return siblingImage;
    }

    current = current.parentElement;
    depth++;
  }

  return null;
}

/**
 * Finds image elements within the DOM using visual stacking order or DOM traversal.
 * Supports various image types including img tags, background images, SVG, canvas, and pseudo-elements.
 *
 * Prefers visual stack search when mouse coordinates are available,
 * falls back to DOM traversal otherwise.
 *
 * @param target - The target element to search from
 * @param mouseX - Optional X coordinate of mouse position for visual stack search
 * @param mouseY - Optional Y coordinate of mouse position for visual stack search
 * @returns The found image element, or null if none found
 */
export function findImage(target: Element, mouseX?: number, mouseY?: number): Element | null {
  if (mouseX && mouseY) {
    const found = findByVisualStack(mouseX, mouseY);
    if (found) return found;
  }

  return findByDOMTraversal(target);
}
