import { useUIStore, useEditorStore } from '@/popup/stores';
import { useKeyboardShortcuts } from '@/popup/hooks';
import { UploadZone } from './UploadZone';
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { ShapeSelector } from './ShapeSelector';
import { EditorActions } from './EditorActions';
import { CropOverlay, ShapeOverlay } from './overlays';

export function EditorTab() {
  const hasImage = useEditorStore((s) => s.hasImage);
  const overlayMode = useUIStore((s) => s.overlayMode);

  useKeyboardShortcuts();

  if (!hasImage()) {
    return (
      <div id="editorTab">
        <UploadZone />
      </div>
    );
  }

  return (
    <div id="editorTab" className="has-image">
      <EditorToolbar disabled={overlayMode !== 'none'} />
      <ShapeSelector disabled={overlayMode !== 'none'} />

      <EditorCanvas>
        {overlayMode === 'crop' && <CropOverlay />}
        {overlayMode === 'shape' && <ShapeOverlay />}
      </EditorCanvas>

      <EditorActions />
      <UploadZone />
    </div>
  );
}
