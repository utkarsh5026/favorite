/**
 * Shape selection UI
 * Handles the favicon shape button controls (circle, square, rounded)
 */

import type { FaviconShape } from '@/types';
import { saveSettings } from '@/extension';
import { applyShapeToPreview } from '@/images/shape';

const SHAPE_CONFIGS = [
  { shape: 'circle', title: 'Circle', borderRadiusClass: 'rounded-full' },
  { shape: 'rounded', title: 'Rounded', borderRadiusClass: 'rounded-md' },
  { shape: 'square', title: 'Square', borderRadiusClass: 'rounded-[2px]' },
] as const;

/**
 * Creates a shape button element
 */
function createShapeButton(config: (typeof SHAPE_CONFIGS)[number]): HTMLButtonElement {
  const button = document.createElement('button');
  button.className =
    'shape-btn flex-1 bg-white/[0.03] border-[1.5px] border-border-light rounded-lg p-3.5 cursor-pointer transition-all duration-250 ease-bounce flex items-center justify-center hover:bg-white/[0.05] hover:border-border-strong hover:-translate-y-px';
  button.setAttribute('data-shape', config.shape);
  button.title = config.title;

  const innerDiv = document.createElement('div');
  innerDiv.className = `w-[26px] h-[26px] bg-gradient-to-br from-text-primary to-[#b0b0b5] shadow-[0_2px_4px_rgba(0,0,0,0.15)] ${config.borderRadiusClass}`;

  button.appendChild(innerDiv);
  return button;
}

/**
 * Sets up the favicon shape selection buttons and their click handlers
 * @param faviconShape - The currently selected favicon shape
 * @param getCurrentFaviconUrl - Function to get the current favicon URL
 */
export function setupShapeButtons(
  faviconShape: FaviconShape,
  getCurrentFaviconUrl: () => string | null
): void {
  const container = document.getElementById('shapeButtonsContainer');
  if (!container) {
    console.error('Shape buttons container not found');
    return;
  }

  // Clear any existing buttons
  container.innerHTML = '';

  const updateShapeButtons = (shape: FaviconShape): void => {
    document.querySelectorAll('.shape-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-shape') === shape);
    });
  };

  const handleBtnClick = async (btn: HTMLButtonElement) => {
    const shape = btn.getAttribute('data-shape') as FaviconShape;
    updateShapeButtons(shape);
    const currentUrl = getCurrentFaviconUrl();
    await Promise.all([
      currentUrl ? applyShapeToPreview(shape, currentUrl) : Promise.resolve(),
      saveSettings({ faviconShape: shape }),
    ]);
  };

  SHAPE_CONFIGS.forEach((config) => {
    const button = createShapeButton(config);
    button.addEventListener('click', () => handleBtnClick(button));
    container.appendChild(button);
  });

  updateShapeButtons(faviconShape);
}
