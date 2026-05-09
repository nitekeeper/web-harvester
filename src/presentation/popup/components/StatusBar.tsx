// src/presentation/popup/components/StatusBar.tsx

import type { ReactNode } from 'react';

import { CheckIcon, SpinIcon, WarnIcon } from '@presentation/components/icons';
import { useFormatMessage, type FormatMessageFn } from '@presentation/hooks/useFormatMessage';

/** Possible save-flow states tracked by {@link StatusBar}. */
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

/** Props for {@link StatusBar}. */
export interface StatusBarProps {
  /** Current save-flow state. */
  readonly status: SaveStatus;
  /** Label of the destination written to; shown in the success message. */
  readonly destinationLabel: string | null;
  /** Human-readable error text shown when `status` is `'error'`. */
  readonly errorMessage?: string;
}

/** Visual descriptor used to render a single status row. */
interface StatusView {
  readonly icon: ReactNode;
  readonly text: string;
  readonly className: string;
}

/** Builds the per-state view descriptor consumed by {@link StatusBar}. */
function buildStatusView(
  status: SaveStatus,
  destinationLabel: string | null,
  errorMessage: string | undefined,
  fmt: FormatMessageFn,
): StatusView {
  if (status === 'saving') {
    return {
      icon: <SpinIcon />,
      text: fmt({ id: 'popup.status.saving', defaultMessage: 'Saving…' }),
      className: 'text-muted-foreground',
    };
  }
  if (status === 'success') {
    const successText =
      destinationLabel != null && destinationLabel !== ''
        ? fmt({ id: 'popup.status.saved', defaultMessage: 'Saved to {folder}' }).replace(
            '{folder}',
            destinationLabel,
          )
        : fmt({ id: 'popup.status.saved.simple', defaultMessage: 'Saved' });
    return {
      icon: <CheckIcon />,
      text: successText,
      className: 'text-green-600 dark:text-green-400',
    };
  }
  if (status === 'error') {
    return {
      icon: <WarnIcon />,
      text: errorMessage ?? fmt({ id: 'popup.status.error', defaultMessage: 'Save failed' }),
      className: 'text-destructive',
    };
  }
  return {
    icon: null,
    text: fmt({ id: 'popup.status.ready', defaultMessage: 'Ready' }),
    className: 'text-muted-foreground/60',
  };
}

/**
 * Renders a one-line status row at the bottom of the popup footer.
 * The four states — idle, saving, success, error — each display a distinct
 * icon and colour derived from Tailwind semantic tokens.
 */
export function StatusBar({ status, destinationLabel, errorMessage }: StatusBarProps) {
  const fmt = useFormatMessage();
  const view = buildStatusView(status, destinationLabel, errorMessage, fmt);

  return (
    <div
      data-testid="status-bar"
      className={`flex items-center gap-1.5 text-[11px] tabular-nums min-h-4 ${view.className}`}
    >
      {view.icon}
      <span>{view.text}</span>
    </div>
  );
}
