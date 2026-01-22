import { TabNavigation } from './components/layout/TabNavigation';
import { StatusMessage } from './components/layout/StatusMessage';
import { SettingsTab } from './components/settings/SettingsTab';
import { EditorTab } from './components/editor/EditorTab';
import { useUIStore } from './stores/uiStore';
import { useInitialize } from './hooks/useInitialize';

export default function App() {
  const currentTab = useUIStore((state) => state.currentTab);

  useInitialize();

  return (
    <div className="w-96 p-5 font-mono">
      <h1 className="text-lg font-medium mb-4 text-text-primary text-center tracking-tight">
        Favicon Preview
      </h1>
      <TabNavigation />
      {currentTab === 'settings' ? <SettingsTab /> : <EditorTab />}
      <StatusMessage />
    </div>
  );
}
