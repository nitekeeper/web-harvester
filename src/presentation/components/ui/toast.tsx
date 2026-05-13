// src/presentation/components/ui/toast.tsx

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

import type { ToastOptions } from '@presentation/hooks/useToast';

/** Props for {@link Toast}. */
interface ToastProps {
  /** Active toast options, or `null`/`undefined` when no toast is showing. */
  readonly toast: ToastOptions | null | undefined;
  /** Called when the user clicks Undo or the toast is dismissed. */
  readonly onDismiss: () => void;
}

/**
 * Bottom-centre toast notification. Auto-dismissed by the parent via
 * `useToast`; this component is purely presentational. When `toast` is null
 * nothing is rendered.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  const fmt = useFormatMessage();
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--wh-panel)',
        border: '1px solid var(--wh-border)',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 12,
        color: 'var(--wh-text)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,.15)',
        zIndex: 9999,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{toast.message}</span>
      {toast.onUndo ? (
        <button
          onClick={() => { toast.onUndo?.(); onDismiss(); }}
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--wh-accent)',
            cursor: 'pointer',
          }}
        >
          {toast.undoLabel ?? fmt({ id: 'toast.undo', defaultMessage: 'Undo' })}
        </button>
      ) : null}
    </div>
  );
}
