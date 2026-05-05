// src/presentation/popup/components/StatusBar.tsx

import type { CSSProperties, ReactNode } from 'react';

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

/** Props for the shared {@link IconSvg} wrapper. */
interface IconSvgProps {
  /** Stroke width applied to the inline SVG path(s). */
  readonly strokeWidth: number;
  /** Whether to round line joins (used by the check + warn glyphs). */
  readonly joinRound?: boolean;
  /** Optional inline style — only the spinner uses this for its animation. */
  readonly style?: CSSProperties;
  /** SVG body — `<path>`, `<polyline>`, `<line>`, etc. */
  readonly children: ReactNode;
}

/** Shared 14 × 14 SVG wrapper with the attributes common to all status icons. */
function IconSvg({ strokeWidth, joinRound, style, children }: IconSvgProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin={joinRound ? 'round' : undefined}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Inline spinner icon — 14 × 14 px, animated. */
function SpinIcon() {
  return (
    <IconSvg strokeWidth={2.5} style={{ animation: 'spin 0.9s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </IconSvg>
  );
}

/** Inline check icon — 14 × 14 px. */
function CheckIcon() {
  return (
    <IconSvg strokeWidth={2.5} joinRound>
      <polyline points="20 6 9 17 4 12" />
    </IconSvg>
  );
}

/** Inline warning triangle icon — 14 × 14 px. */
function WarnIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </IconSvg>
  );
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
    return {
      icon: <CheckIcon />,
      text: fmt({ id: 'popup.status.saved', defaultMessage: 'Saved to {folder}' }).replace(
        '{folder}',
        destinationLabel ?? '',
      ),
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
      className={`flex items-center gap-1.5 text-[11px] min-h-4 ${view.className}`}
    >
      {view.icon}
      <span>{view.text}</span>
    </div>
  );
}
