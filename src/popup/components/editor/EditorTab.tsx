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

  useKeyboardShortcuts();

  return (
    <div id="editorTab" className="has-image">
      <EditorToolbar disabled={!hasImage || overlayMode !== 'none'} />

      <ShapeSelector disabled={!hasImage || overlayMode !== 'none'} />

      <EditorCanvas>
        {overlayMode === 'crop' && <CropOverlay />}
        {overlayMode === 'shape' && <ShapeOverlay />}
      </EditorCanvas>

      <EditorActions />
    </div>
  );
}
