/**
 * Configuration sliders UI
 * Handles the hover delay, restore delay, and favicon size sliders
 */

import type { UserSettings } from '@/extension';
import { saveSettings } from '@/extension';
import { byID } from '@/utils';

const SLIDER_CONFIGS = [
  {
    id: 'hoverDelay',
    label: 'Hover Delay',
    setting: 'hoverDelay',
    min: 0,
    max: 500,
    step: 50,
    suffix: 'ms',
  },
  {
    id: 'restoreDelay',
    label: 'Restore Delay',
    setting: 'restoreDelay',
    min: 0,
    max: 1000,
    step: 100,
    suffix: 'ms',
  },
  {
    id: 'faviconSize',
    label: 'Favicon Size',
    setting: 'faviconSize',
    min: 16,
    max: 64,
    step: 8,
    suffix: 'px',
  },
];

/**
 * Creates a slider element with label and value display
 */
function createSlider(config: (typeof SLIDER_CONFIGS)[number], value: number): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'mb-4.5';

  const label = document.createElement('label');
  label.className = 'block text-sm font-medium text-text-subtle mb-2.5 uppercase tracking-wider';
  label.htmlFor = config.id;
  label.textContent = config.label;

  const flexContainer = document.createElement('div');
  flexContainer.className = 'flex items-center gap-3.5';

  // Create slider input
  const input = document.createElement('input');
  input.type = 'range';
  input.id = config.id;
  input.min = String(config.min);
  input.max = String(config.max);
  input.step = String(config.step);
  input.value = String(value);
  input.className = 'flex-1 h-[5px] bg-white/[0.08] rounded-lg outline-none';

  // Create value display
  const valueSpan = document.createElement('span');
  valueSpan.className = 'text-base font-medium text-text-secondary min-w-[50px] text-right';
  valueSpan.id = `${config.id}Value`;
  valueSpan.textContent = `${value}${config.suffix}`;

  // Assemble
  flexContainer.appendChild(input);
  flexContainer.appendChild(valueSpan);
  container.appendChild(label);
  container.appendChild(flexContainer);

  return container;
}

/**
 * Sets up the configuration sliders for hover delay, restore delay, and favicon size
 * @param settings - The current user settings to populate slider values
 */
export function setupSliders(settings: UserSettings): void {
  const container = document.getElementById('slidersContainer');
  if (!container) {
    console.error('Sliders container not found');
    return;
  }

  // Clear any existing sliders
  container.innerHTML = '';

  const updateSliderValue = (id: string, value: number, suffix: string): void => {
    const valueEl = document.getElementById(`${id}Value`);
    if (!valueEl) return;
    valueEl.textContent = `${value}${suffix}`;
  };

  SLIDER_CONFIGS.forEach((config) => {
    const value = Number(settings[config.setting as keyof UserSettings]);
    const sliderElement = createSlider(config, value);
    container.appendChild(sliderElement);

    const input = byID<HTMLInputElement>(config.id);
    if (input) {
      input.addEventListener('input', async () => {
        const newValue = Number(input.value);
        updateSliderValue(config.id, newValue, config.suffix);
        await saveSettings({ [config.setting]: newValue } as Partial<UserSettings>);
      });
    }
  });
}
