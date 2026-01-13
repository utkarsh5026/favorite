/**
 * History section UI
 * Handles displaying and managing favicon history
 */

import { byID } from '@/utils';
import { showStatus } from '@/extension';
import { HistoryManager } from '@/history';

/**
 * Loads and displays the favicon history for a specific hostname
 */
export async function loadHistorySection(hostname: string): Promise<void> {
  const historySection = byID('historySection');
  const historyGrid = byID('historyGrid');
  const historyEmpty = byID('historyEmpty');

  if (!historySection || !historyGrid) return;

  const entries = await HistoryManager.getEntriesForSite(hostname);

  if (entries.length === 0) {
    historyEmpty?.classList.add('visible');
    historySection.classList.add('visible');
    return;
  }

  historyEmpty?.classList.remove('visible');
  historySection.classList.add('visible');

  historyGrid.innerHTML = entries
    .map(
      (entry, index) => `
    <button class="history-item" data-index="${index}" data-url="${encodeURIComponent(entry.originalUrl)}" title="Click to apply">
      <img src="${entry.thumbnail}" alt="History ${index + 1}" />
      ${entry.source === 'lock' ? '<span class="history-badge">🔒</span>' : ''}
    </button>
  `
    )
    .join('');

  historyGrid.querySelectorAll<HTMLButtonElement>('.history-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = decodeURIComponent(btn.dataset.url || '');
      if (url) applyHistoryEntry(url);
    });
  });
}

/**
 * Applies a history entry as the current favicon
 */
async function applyHistoryEntry(imageUrl: string): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, {
    type: 'contextMenuAction',
    action: 'preview',
    imageUrl,
    hostname: new URL(tab.url || '').hostname,
  });

  showStatus('Applied from history');
}

/**
 * Sets up the clear history button
 */
export function setupClearHistoryButton(hostname: string): void {
  const clearBtn = byID('clearHistoryBtn');
  clearBtn?.addEventListener('click', async () => {
    await HistoryManager.clearHistory(hostname);
    await loadHistorySection(hostname);
    showStatus('History cleared');
  });
}

/**
 * Listens for history changes and reloads the section
 */
export function listenForHistoryChanges(hostname: string): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.faviconHistory) {
      loadHistorySection(hostname);
    }
  });
}
