/**
 * Declarative Shape Selector Component
 */

import { setActive } from '@/utils';
import type { FaviconShape } from '@/types';

const SHAPES: [FaviconShape, string, string][] = [
  ['circle', 'Circle Shape', '<circle cx="12" cy="12" r="10"/>'],
  ['rounded', 'Rounded Shape', '<rect x="3" y="3" width="18" height="18" rx="4" ry="4"/>'],
  ['square', 'Square Shape', '<rect x="3" y="3" width="18" height="18"/>'],
  [
    'heart',
    'Heart Shape',
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
  ],
  ['hexagon', 'Hexagon Shape', '<path d="M12 2l9 5v10l-9 5-9-5V7z" />'],
];

const DEFAULT_SHAPE: FaviconShape = 'square';

export class ShapeSelector {
  private buttons = new Map<FaviconShape, HTMLButtonElement>();

  private createButton(shape: FaviconShape, title: string, svgContent: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `editor-btn shape-btn${shape === DEFAULT_SHAPE ? ' active' : ''}`;
    btn.dataset.shape = shape;
    btn.title = title;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svgContent}</svg>`;
    return btn;
  }

  setActiveShape(shape: FaviconShape): void {
    this.buttons.forEach((btn, s) => setActive(btn, s === shape));
  }

  init(container: HTMLElement, onSelect: (shape: FaviconShape) => void): void {
    this.buttons.clear();
    container.innerHTML = '';

    for (const [shape, title, svg] of SHAPES) {
      const btn = this.createButton(shape, title, svg);
      btn.addEventListener('click', () => onSelect(shape));
      this.buttons.set(shape, btn);
      container.appendChild(btn);
    }
  }
}
