/**
 * Minimal button helper - generates HTML from config
 */

interface BtnConfig {
  id: string;
  label: string;
  icon: string;
  title: string;
  primary?: boolean;
}

const btn = (cfg: BtnConfig, border: string) => `
  <button class="btn-group-item flex-1 flex items-center justify-center gap-1.5 ${border} px-2.5 py-2.5 cursor-pointer transition-all duration-250 ease-bounce text-xs font-semibold font-mono tracking-tight disabled:opacity-40 disabled:cursor-not-allowed ${cfg.primary ? 'download-btn bg-white border-none text-text-dark shadow-btn hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:enabled:animate-glow' : 'bg-white/[0.05] text-text-secondary hover:enabled:bg-white/[0.08] hover:enabled:border-white/25 hover:enabled:-translate-y-px hover:enabled:shadow-[0_2px_8px_rgba(255,255,255,0.1)]'}" id="${cfg.id}" disabled title="${cfg.title}">
    <svg class="w-3.5 h-3.5 transition-transform duration-300 ease-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${cfg.icon}</svg>
    <span class="transition-opacity duration-200">${cfg.label}</span>
  </button>`;

function initButtonGroup(containerId: string, buttons: BtnConfig[]) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.className = 'btn-group';
  const borders = ['border-none', 'border-l border-r border-border-medium', 'border-none'];
  container.innerHTML = buttons
    .map((b, i) => btn(b, b.primary ? 'border-none' : borders[i]))
    .join('');
}

export function initButtons() {
  initButtonGroup('actionButtons', [
    {
      id: 'downloadBtn',
      label: 'Download',
      title: 'Download as ZIP',
      primary: true,
      icon: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
    },
    {
      id: 'bringToEditorBtn',
      label: 'Editor',
      title: 'Open in editor',
      icon: `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
    },
    {
      id: 'setDefaultBtn',
      label: 'Set Default',
      title: 'Set as default favicon for this site',
      icon: `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`,
    },
  ]);
}
