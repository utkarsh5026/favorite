import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImageFinder } from '../src/image';

// Mock getBoundingClientRect to return visible dimensions by default
const mockVisibleRect = () => ({
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  bottom: 100,
  right: 100,
  x: 0,
  y: 0,
  toJSON: () => {},
});

describe('ImageFinder', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();

    // Mock getBoundingClientRect for all elements to return visible dimensions
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue(mockVisibleRect());

    // Stub elementsFromPoint if not available (happy-dom doesn't have it)
    if (!document.elementsFromPoint) {
      (document as Document & { elementsFromPoint: unknown }).elementsFromPoint = () => [];
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('find()', () => {
    it('returns the target when it is an img element', () => {
      const img = document.createElement('img');
      img.src = 'test.png';
      document.body.appendChild(img);

      const finder = new ImageFinder(img);
      expect(finder.find()).toBe(img);
    });

    it('returns the target when it is an svg element', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      document.body.appendChild(svg);

      const finder = new ImageFinder(svg);
      expect(finder.find()).toBe(svg);
    });

    it('returns the target when it is a canvas element', () => {
      const canvas = document.createElement('canvas');
      document.body.appendChild(canvas);

      const finder = new ImageFinder(canvas);
      expect(finder.find()).toBe(canvas);
    });

    it('returns the target when it is a picture element', () => {
      const picture = document.createElement('picture');
      document.body.appendChild(picture);

      const finder = new ImageFinder(picture);
      expect(finder.find()).toBe(picture);
    });

    it('returns the target when it is a video element', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      const finder = new ImageFinder(video);
      expect(finder.find()).toBe(video);
    });

    it('returns the target when it has role="img"', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'img');
      document.body.appendChild(div);

      const finder = new ImageFinder(div);
      expect(finder.find()).toBe(div);
    });

    it('finds img descendant of target', () => {
      const div = document.createElement('div');
      const img = document.createElement('img');
      img.src = 'test.png';
      div.appendChild(img);
      document.body.appendChild(div);

      const finder = new ImageFinder(div);
      expect(finder.find()).toBe(img);
    });

    it('returns null when no image found', () => {
      const div = document.createElement('div');
      div.textContent = 'no image here';
      document.body.appendChild(div);

      const finder = new ImageFinder(div);
      expect(finder.find()).toBeNull();
    });
  });

  describe('findByVisualStack()', () => {
    it('uses elementsFromPoint when coordinates provided', () => {
      const img = document.createElement('img');
      img.src = 'test.png';
      document.body.appendChild(img);

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([img]);

      const finder = new ImageFinder(document.body, 100, 100);
      expect(finder.find()).toBe(img);
      expect(document.elementsFromPoint).toHaveBeenCalledWith(100, 100);
    });

    it('prioritizes img elements over background images in visual stack', () => {
      const img = document.createElement('img');
      img.src = 'test.png';
      document.body.appendChild(img);

      const divWithBg = document.createElement('div');
      document.body.appendChild(divWithBg);

      // Mock getComputedStyle for background image
      const originalGetComputedStyle = window.getComputedStyle;
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
        const style = originalGetComputedStyle(el, pseudo);
        if (el === divWithBg) {
          return {
            ...style,
            backgroundImage: 'url("bg.png")',
            display: 'block',
            visibility: 'visible',
            opacity: '1',
          } as CSSStyleDeclaration;
        }
        return style;
      });

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([divWithBg, img]);

      const finder = new ImageFinder(document.body, 100, 100);
      expect(finder.find()).toBe(img);
    });

    it('falls back to DOM traversal when visual stack finds nothing', () => {
      const div = document.createElement('div');
      const img = document.createElement('img');
      img.src = 'test.png';
      div.appendChild(img);
      document.body.appendChild(div);

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([]);

      const finder = new ImageFinder(div, 100, 100);
      expect(finder.find()).toBe(img);
    });
  });

  describe('findByDOMTraversal()', () => {
    it('finds image in ancestor (parent)', () => {
      const parentImg = document.createElement('img');
      parentImg.src = 'parent.png';
      const child = document.createElement('span');
      child.textContent = 'child';
      parentImg.appendChild(child);
      document.body.appendChild(parentImg);

      const finder = new ImageFinder(child);
      expect(finder.find()).toBe(parentImg);
    });

    it('finds image in sibling of ancestor', () => {
      const container = document.createElement('div');
      const siblingImg = document.createElement('img');
      siblingImg.src = 'sibling.png';
      const targetDiv = document.createElement('div');
      targetDiv.textContent = 'target';
      container.appendChild(siblingImg);
      container.appendChild(targetDiv);
      document.body.appendChild(container);

      const finder = new ImageFinder(targetDiv);
      expect(finder.find()).toBe(siblingImg);
    });

    it('respects max depth of 5 levels', () => {
      // Create a deep nesting of 7 levels
      let current: Element = document.createElement('div');
      document.body.appendChild(current);

      for (let i = 0; i < 7; i++) {
        const child = document.createElement('div');
        current.appendChild(child);
        current = child;
      }

      // Add img at the very top (more than 5 levels up)
      const img = document.createElement('img');
      img.src = 'test.png';
      document.body.insertBefore(img, document.body.firstChild);

      const finder = new ImageFinder(current);
      // Should not find the img because it's more than 5 levels up
      expect(finder.find()).toBeNull();
    });
  });

  describe('isImageElement()', () => {
    it.each(['img', 'svg', 'canvas', 'picture', 'video'])(
      'recognizes %s as image element',
      (tag) => {
        const el =
          tag === 'svg'
            ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            : document.createElement(tag);
        document.body.appendChild(el);

        const finder = new ImageFinder(el);
        expect(finder.find()).toBe(el);
      }
    );

    it('recognizes custom elements with "image" in tag name', () => {
      const customEl = document.createElement('custom-image');
      document.body.appendChild(customEl);

      const finder = new ImageFinder(customEl);
      expect(finder.find()).toBe(customEl);
    });

    it('recognizes custom elements with "img" in tag name', () => {
      const customEl = document.createElement('my-img-element');
      document.body.appendChild(customEl);

      const finder = new ImageFinder(customEl);
      expect(finder.find()).toBe(customEl);
    });
  });

  describe('hasBackgroundImage()', () => {
    it('finds element with background-image url', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      const child = document.createElement('span');
      div.appendChild(child);

      const originalGetComputedStyle = window.getComputedStyle;
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
        const style = originalGetComputedStyle(el, pseudo);
        if (el === div && !pseudo) {
          return {
            ...style,
            backgroundImage: 'url("test.png")',
            display: 'block',
            visibility: 'visible',
            opacity: '1',
          } as CSSStyleDeclaration;
        }
        return style;
      });

      const finder = new ImageFinder(child);
      expect(finder.find()).toBe(div);
    });

    it('ignores elements with backgroundImage: none', () => {
      const div = document.createElement('div');
      div.textContent = 'no bg';
      document.body.appendChild(div);

      const finder = new ImageFinder(div);
      expect(finder.find()).toBeNull();
    });
  });

  describe('isVisible()', () => {
    it('returns false for display: none elements', () => {
      const img = document.createElement('img');
      img.src = 'test.png';
      img.style.display = 'none';
      document.body.appendChild(img);

      // Need to mock getComputedStyle to return display: none
      const originalGetComputedStyle = window.getComputedStyle;
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
        const style = originalGetComputedStyle(el, pseudo);
        if (el === img) {
          return {
            ...style,
            display: 'none',
            visibility: 'visible',
            opacity: '1',
          } as CSSStyleDeclaration;
        }
        return style;
      });

      // The target check in findByDOMTraversal uses isImageElement but not isVisible
      // So we need to check via findImageDescendant path
      const container = document.createElement('div');
      container.appendChild(img);
      document.body.appendChild(container);

      const finder = new ImageFinder(container);
      expect(finder.find()).toBeNull();
    });

    it('returns false for visibility: hidden elements', () => {
      const container = document.createElement('div');
      const img = document.createElement('img');
      img.src = 'test.png';
      container.appendChild(img);
      document.body.appendChild(container);

      const originalGetComputedStyle = window.getComputedStyle;
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
        const style = originalGetComputedStyle(el, pseudo);
        if (el === img) {
          return {
            ...style,
            display: 'block',
            visibility: 'hidden',
            opacity: '1',
          } as CSSStyleDeclaration;
        }
        return style;
      });

      const finder = new ImageFinder(container);
      expect(finder.find()).toBeNull();
    });

    it('returns false for opacity: 0 elements', () => {
      const container = document.createElement('div');
      const img = document.createElement('img');
      img.src = 'test.png';
      container.appendChild(img);
      document.body.appendChild(container);

      const originalGetComputedStyle = window.getComputedStyle;
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
        const style = originalGetComputedStyle(el, pseudo);
        if (el === img) {
          return {
            ...style,
            display: 'block',
            visibility: 'visible',
            opacity: '0',
          } as CSSStyleDeclaration;
        }
        return style;
      });

      const finder = new ImageFinder(container);
      expect(finder.find()).toBeNull();
    });

    it('returns false for zero-dimension elements', () => {
      const container = document.createElement('div');
      const img = document.createElement('img');
      img.src = 'test.png';
      container.appendChild(img);
      document.body.appendChild(container);

      img.getBoundingClientRect = vi.fn().mockReturnValue({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const finder = new ImageFinder(container);
      expect(finder.find()).toBeNull();
    });
  });

  describe('hasPseudoElementImage()', () => {
    it('detects pseudo-element with background image', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      const originalGetComputedStyle = window.getComputedStyle;
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
        if (el === div && pseudo === '::before') {
          return {
            backgroundImage: 'url("pseudo.png")',
            width: '20px',
            height: '20px',
          } as CSSStyleDeclaration;
        }
        return originalGetComputedStyle(el, pseudo);
      });

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([div]);

      const finder = new ImageFinder(document.body, 100, 100);
      expect(finder.find()).toBe(div);
    });

    it('ignores pseudo-element with zero dimensions', () => {
      const div = document.createElement('div');
      div.textContent = 'no real content';
      document.body.appendChild(div);

      const originalGetComputedStyle = window.getComputedStyle;
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
        if (el === div && pseudo === '::before') {
          return {
            backgroundImage: 'url("pseudo.png")',
            width: '0px',
            height: '0px',
          } as CSSStyleDeclaration;
        }
        return originalGetComputedStyle(el, pseudo);
      });

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([div]);

      const finder = new ImageFinder(document.body, 100, 100);
      expect(finder.find()).toBeNull();
    });
  });
});
