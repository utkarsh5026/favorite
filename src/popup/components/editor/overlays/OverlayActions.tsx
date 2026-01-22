import { X, Check } from 'lucide-react';

interface OverlayActionsProps {
  classPrefix: string;
  onApply: () => void;
  onCancel: () => void;
}

/**
 * Apply/Cancel action buttons for overlays
 */
export function OverlayActions({
  classPrefix,
  onApply,
  onCancel,
}: OverlayActionsProps) {
  return (
    <div className={`${classPrefix}-actions`}>
      <button
        className={`${classPrefix}-action-btn ${classPrefix}-cancel-btn`}
        title="Cancel (Esc)"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
      >
        <X size={16} />
      </button>
      <button
        className={`${classPrefix}-action-btn ${classPrefix}-apply-btn`}
        title="Apply (Enter)"
        onClick={(e) => {
          e.stopPropagation();
          onApply();
        }}
      >
        <Check size={16} />
      </button>
    </div>
  );
}
