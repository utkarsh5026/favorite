/**
 * Tab Manager for popup navigation
 * Handles switching between Settings and Editor tabs
 */

import { byID, setActive, toggleClasses } from '@/utils';

export type TabId = 'settings' | 'editor';

type TabChangeCallback = (tabId: TabId) => void;

const tabChangeCallbacks: TabChangeCallback[] = [];
let currentTab: TabId = 'settings';

/**
 * Get the currently active tab
 */
export function getCurrentTab(): TabId {
  return currentTab;
}

/**
 * Switch to a specific tab
 */
export function switchToTab(tabId: TabId): void {
  if (tabId === currentTab) return;

  const tabButtons = document.querySelectorAll('[data-tab]');
  tabButtons.forEach((btn) => {
    const isActive = btn.getAttribute('data-tab') === tabId;
    setActive(btn as HTMLElement, isActive);
  });

  const settingsTab = byID('settingsTab');
  const editorTab = byID('editorTab');

  const isSettings = tabId === 'settings';

  toggleClasses(settingsTab, { hidden: !isSettings, active: isSettings });
  toggleClasses(editorTab, { hidden: isSettings, active: !isSettings });

  currentTab = tabId;
  tabChangeCallbacks.forEach((cb) => cb(tabId));
}

/**
 * Register a callback for tab changes
 */
export function onTabChange(callback: TabChangeCallback): void {
  tabChangeCallbacks.push(callback);
}

/**
 * Initialize tab navigation
 */
export function setupTabs(): void {
  const tabButtons = document.querySelectorAll('[data-tab]');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab') as TabId;
      if (tabId) {
        switchToTab(tabId);
      }
    });
  });

  switchToTab('settings');
}
