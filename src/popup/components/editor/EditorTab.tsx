import { useCallback } from 'react';
import { X } from 'lucide-react';
import { useUIStore, useEditorStore } from '@/popup/stores';
import { useKeyboardShortcuts } from '@/popup/hooks';
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { ShapeSelector } from './ShapeSelector';
import { EditorActions } from './EditorActions';
import { CropOverlay, ShapeOverlay } from './overlays';

export function EditorTab() {
  const overlayMode = useUIStore((s) => s.overlayMode);
  const hasImage = useEditorStore((s) => s.hasImage());
  const reset = useEditorStore((s) => s.reset);

  useKeyboardShortcuts();

  const handleRemoveImage = useCallback(() => {
    void reset();
  }, [reset]);

  return (
    <div id="editorTab" className="has-image">
      <div className="mb-4">
        <EditorToolbar disabled={!hasImage || overlayMode !== 'none'} />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <ShapeSelector disabled={!hasImage || overlayMode !== 'none'} />
        {hasImage && overlayMode === 'none' && (
          <button
            onClick={handleRemoveImage}
            className="ml-auto flex items-center justify-center w-7 h-7 rounded-md bg-white/3 border border-white/10 cursor-pointer transition-all duration-200 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
            title="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <EditorCanvas>
        {overlayMode === 'crop' && <CropOverlay />}
        {overlayMode === 'shape' && <ShapeOverlay />}
      </EditorCanvas>

      <EditorActions />
    </div>
  );
}
