import { useUIStore } from '../../stores/uiStore';

export function TabNavigation() {
  const { currentTab, switchToTab } = useUIStore();

  return (
    <div className="tab-nav">
      <button
        className={`tab-btn ${currentTab === 'settings' ? 'active' : ''}`}
        onClick={() => switchToTab('settings')}
      >
        Settings
      </button>
      <button
        className={`tab-btn ${currentTab === 'editor' ? 'active' : ''}`}
        onClick={() => switchToTab('editor')}
      >
        Editor
      </button>
    </div>
  );
}
