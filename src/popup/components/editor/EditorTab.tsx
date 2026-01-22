import { useUIStore } from '@/popup/stores';
import { useKeyboardShortcuts } from '@/popup/hooks';
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { ShapeSelector } from './ShapeSelector';
import { EditorActions } from './EditorActions';
import { CropOverlay, ShapeOverlay } from './overlays';

export function EditorTab() {
  const overlayMode = useUIStore((s) => s.overlayMode);

  useKeyboardShortcuts();

  return (
    <div id="editorTab" className="has-image">
      <EditorToolbar disabled={overlayMode !== 'none'} />
      <ShapeSelector disabled={overlayMode !== 'none'} />

      <EditorCanvas>
        {overlayMode === 'crop' && <CropOverlay />}
        {overlayMode === 'shape' && <ShapeOverlay />}
      </EditorCanvas>

      <EditorActions />
    </div>
  );
}
