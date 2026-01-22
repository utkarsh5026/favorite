import { useCallback, type ComponentType } from 'react';
import {
  Undo2,
  Redo2,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Crop,
  RefreshCcw,
  type LucideProps,
} from 'lucide-react';
import { useUIStore, useEditorStore } from '@/popup/stores';

interface ToolbarButtonConfig {
  id: string;
  title: string;
  icon: ComponentType<LucideProps>;
  group?: string;
}

const TOOLBAR_BUTTONS: ToolbarButtonConfig[] = [
  {
    id: 'undo',
    title: 'Undo (Ctrl+Z)',
    icon: Undo2,
    group: 'history',
  },
  {
    id: 'redo',
    title: 'Redo (Ctrl+Y)',
    icon: Redo2,
    group: 'history',
  },
  {
    id: 'rotateLeft',
    title: 'Rotate Left (90°)',
    icon: RotateCcw,
    group: 'rotate',
  },
  {
    id: 'rotateRight',
    title: 'Rotate Right (90°)',
    icon: RotateCw,
    group: 'rotate',
  },
  {
    id: 'flipH',
    title: 'Flip Horizontal',
    icon: FlipHorizontal2,
    group: 'flip',
  },
  {
    id: 'flipV',
    title: 'Flip Vertical',
    icon: FlipVertical2,
    group: 'flip',
  },
  {
    id: 'crop',
    title: 'Crop Image',
    icon: Crop,
    group: 'crop',
  },
  {
    id: 'reset',
    title: 'Reset All Changes',
    icon: RefreshCcw,
    group: 'actions',
  },
];

interface EditorToolbarProps {
  disabled?: boolean;
}

export function EditorToolbar({ disabled = false }: EditorToolbarProps) {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    rotateClockwise,
    rotateCounterClockwise,
    flipHorizontal,
    flipVertical,
    resetToOriginal,
  } = useEditorStore();
  const enterCropMode = useUIStore((s) => s.enterCropMode);

  const handleClick = useCallback(
    (id: string) => {
      switch (id) {
        case 'undo':
          undo();
          break;
        case 'redo':
          redo();
          break;
        case 'rotateLeft':
          void rotateCounterClockwise();
          break;
        case 'rotateRight':
          void rotateClockwise();
          break;
        case 'flipH':
          void flipHorizontal();
          break;
        case 'flipV':
          void flipVertical();
          break;
        case 'crop':
          enterCropMode();
          break;
        case 'reset':
          if (confirm('Reset all changes to the original image?')) {
            resetToOriginal();
          }
          break;
      }
    },
    [
      undo,
      redo,
      rotateClockwise,
      rotateCounterClockwise,
      flipHorizontal,
      flipVertical,
      enterCropMode,
      resetToOriginal,
    ]
  );

  const isButtonDisabled = useCallback(
    (id: string) => {
      if (disabled) return true;
      if (id === 'undo') return !canUndo();
      if (id === 'redo') return !canRedo();
      return false;
    },
    [disabled, canUndo, canRedo]
  );

  let lastGroup: string | undefined;

  return (
    <div
      id="toolbarButtons"
      className="flex items-center gap-1.5 flex-wrap mb-4"
    >
      {TOOLBAR_BUTTONS.map((btn) => {
        const showDivider = lastGroup && btn.group !== lastGroup;
        lastGroup = btn.group;

        return (
          <div key={btn.id} className="contents">
            {showDivider && (
              <div className="w-px h-5 bg-white/10 mx-1" />
            )}
            <button
              id={`editor${capitalize(btn.id)}`}
              className="flex items-center justify-center w-7 h-7 rounded-md bg-white/3 border border-white/10 cursor-pointer transition-all duration-200 hover:enabled:bg-white/6 hover:enabled:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
              title={btn.title}
              disabled={isButtonDisabled(btn.id)}
              onClick={() => handleClick(btn.id)}
            >
              <btn.icon size={14} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
