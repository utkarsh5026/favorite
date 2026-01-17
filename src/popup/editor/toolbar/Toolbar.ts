import { setDisabled, createEl } from '@/utils';

export interface ToolbarButtonConfig {
  id: string;
  title: string;
  icon: string;
  group?: string;
  disabled?: boolean;
}

export const TOOLBAR_BUTTONS: ToolbarButtonConfig[] = [
  {
    id: 'undo',
    title: 'Undo (Ctrl+Z)',
    icon: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.5L3 7"/>',
    group: 'history',
    disabled: true,
  },
  {
    id: 'redo',
    title: 'Redo (Ctrl+Y)',
    icon: '<path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.5L21 7"/>',
    group: 'history',
    disabled: true,
  },
  {
    id: 'rotateLeft',
    title: 'Rotate Left (90°)',
    icon: '<path d="M2.5 2v6h6"/><path d="M2.5 8a10 10 0 0 1 17.07-5.93"/><path d="M22 12a10 10 0 0 1-18.56 5.14"/>',
    group: 'rotate',
  },
  {
    id: 'rotateRight',
    title: 'Rotate Right (90°)',
    icon: '<path d="M21.5 2v6h-6"/><path d="M21.5 8a10 10 0 0 0-17.07-5.93"/><path d="M2 12a10 10 0 0 0 18.56 5.14"/>',
    group: 'rotate',
  },
  {
    id: 'flipH',
    title: 'Flip Horizontal',
    icon: '<path d="M12 3v18"/><path d="M16 7l4 5-4 5"/><path d="M8 7l-4 5 4 5"/>',
    group: 'flip',
  },
  {
    id: 'flipV',
    title: 'Flip Vertical',
    icon: '<path d="M3 12h18"/><path d="M7 8l5-4 5 4"/><path d="M7 16l5 4 5-4"/>',
    group: 'flip',
  },
  {
    id: 'crop',
    title: 'Crop Image',
    icon: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
    group: 'crop',
  },
  {
    id: 'reset',
    title: 'Reset All Changes',
    icon: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    group: 'actions',
  },
];

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export class Toolbar {
  private buttons = new Map<string, HTMLButtonElement>();

  private createButton({ id, title, disabled, icon }: ToolbarButtonConfig): HTMLButtonElement {
    return createEl('button', 'editor-btn', {
      id: `editor${capitalize(id)}`,
      title,
      disabled: disabled ?? false,
      innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>`,
    });
  }

  init(container: HTMLElement, handlers: Record<string, () => void | Promise<void>>): void {
    this.buttons.clear();
    container.innerHTML = '';

    let lastGroup: string | undefined;
    const children = [];

    for (const config of TOOLBAR_BUTTONS) {
      if (lastGroup && config.group !== lastGroup) {
        children.push(createEl('div', 'editor-toolbar-divider'));
      }

      const btn = this.createButton(config);
      const handler = handlers[config.id];
      if (handler) {
        btn.addEventListener('click', () => {
          void handler();
        });
      }

      this.buttons.set(config.id, btn);
      children.push(btn);
      lastGroup = config.group;
    }

    container.append(...children);
  }

  /** Enable or disable a toolbar button by ID */
  setDisabled(id: string, disabled: boolean) {
    setDisabled(this.buttons.get(id) || null, disabled);
  }

  /** Enable or disable all toolbar buttons, with optional exceptions */
  setAllEnabled(enabled: boolean, except?: Record<string, boolean>): void {
    this.buttons.forEach((btn, id) => {
      if (enabled && except && id in except) {
        setDisabled(btn, !except[id]);
      } else {
        setDisabled(btn, !enabled);
      }
    });
  }
}
