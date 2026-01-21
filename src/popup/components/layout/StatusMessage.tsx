import { useUIStore } from '../../stores/uiStore';

export function StatusMessage() {
  const statusMessage = useUIStore((state) => state.statusMessage);

  return (
    <div
      className={`text-sm text-center text-text-secondary min-h-4.5 transition-opacity duration-300 ease-bounce ${
        statusMessage ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {statusMessage || '\u00A0'}
    </div>
  );
}
