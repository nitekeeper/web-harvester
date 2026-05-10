// src/presentation/settings/sections/templates/PickElementButton.tsx

import type { FormatMessageFn } from '@presentation/hooks/useFormatMessage';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

/** Resolves the pick-element button label from the format function and picking state. */
export function resolvePickLabel(fmt: FormatMessageFn, isPicking: boolean): string {
  return isPicking
    ? fmt({ id: 'settings.templates.pickingElement', defaultMessage: 'Click element on page…' })
    : fmt({ id: 'settings.templates.pickElement', defaultMessage: 'Pick element' });
}

/** Props for {@link PickElementButton}. */
export interface PickElementButtonProps {
  /** Whether a CSS pick session is currently active. */
  readonly isPicking: boolean;
  /** Called when the button is clicked. */
  readonly onClick: () => void;
}

/**
 * Inline button that starts or shows the status of a CSS picker session.
 * Displays "Pick element" when idle and "Click element on page…" when active.
 */
export function PickElementButton({ isPicking, onClick }: PickElementButtonProps) {
  const fmt = useFormatMessage();
  const label = resolvePickLabel(fmt, isPicking);
  return (
    <button
      type="button"
      aria-busy={isPicking}
      onClick={onClick}
      disabled={isPicking}
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 4,
        border: '1px solid var(--wh-border)',
        background: isPicking ? 'var(--wh-hover)' : 'transparent',
        color: 'var(--wh-subtle)',
        cursor: isPicking ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
