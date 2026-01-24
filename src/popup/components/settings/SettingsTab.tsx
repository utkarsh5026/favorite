import { LivePreviewSection } from './LivePreviewSection';
import { TogglesSection } from './TogglesSection';
import { DownloadSection } from './DownloadSection';
import { ResetSection } from './ResetSection';

export function SettingsTab() {
  return (
    <div id="settingsTab">
      <LivePreviewSection />

      <div className="h-px bg-linear-to-r from-transparent via-white/8 to-transparent my-5"></div>

      <TogglesSection />

      <div className="h-px bg-linear-to-r from-transparent via-white/8 to-transparent my-5"></div>

      <DownloadSection />

      <ResetSection />
    </div>
  );
}
