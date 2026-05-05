// src/presentation/popup/components/ActionFooter.tsx
//
// Two-row footer composite for the popup. The first row holds the primary
// "Clip Page" button (full-width via flex-1) plus three icon-only mode
// toggles (section picker, highlight, reader). The second row hosts the
// shared {@link StatusBar} reflecting the current save-flow state. The
// component is fully prop-driven — the parent wires it to the popup store —
// keeping it trivial to test in isolation.

import type { ReactNode } from 'react';

import { SpinIcon } from '@presentation/components/icons';
import { IconSvg } from '@presentation/components/IconSvg';
import { Button } from '@presentation/components/ui/button';
import { useFormatMessage, type FormatMessageFn } from '@presentation/hooks/useFormatMessage';
import type { SaveStatus } from '@presentation/popup/components/StatusBar';
import { StatusBar } from '@presentation/popup/components/StatusBar';

/** Props for {@link ActionFooter}. */
export interface ActionFooterProps {
  /** Whether a save is in flight — disables the button and shows spinner. */
  readonly isSaving: boolean;
  /** Whether the button should be disabled (no destination selected). */
  readonly isDisabled: boolean;
  /** Invoked when the user clicks the Clip Page button. */
  readonly onSave: () => void;
  /** Whether the section picker overlay is active. */
  readonly isPickerActive: boolean;
  /** Whether highlight mode is active. */
  readonly isHighlightActive: boolean;
  /** Whether reader mode is active. */
  readonly isReaderActive: boolean;
  /** Toggles the section picker. */
  readonly onPickerToggle: () => void;
  /** Toggles highlight mode. */
  readonly onHighlightToggle: () => void;
  /** Toggles reader mode. */
  readonly onReaderToggle: () => void;
  /** Current save-flow status forwarded to the status bar. */
  readonly saveStatus: SaveStatus;
  /** Label of the destination last saved to, forwarded to the status bar. */
  readonly saveDestinationLabel: string | null;
}

/** Section-picker glyph — crosshair-style square with centre dot. */
function PickerIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="1.5" />
    </IconSvg>
  );
}

/** Highlight-mode glyph — marker-pen outline. */
function HighlightIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <path d="M9 11l-6 6v4h4l6-6" />
      <path d="M22 6l-4-4-9 9 4 4 9-9z" />
    </IconSvg>
  );
}

/** Reader-mode glyph — open book outline. */
function ReaderIcon() {
  return (
    <IconSvg strokeWidth={2} joinRound>
      <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
      <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
    </IconSvg>
  );
}

/** Shared Tailwind class string for the three footer mode-toggle icon buttons. */
const TOGGLE_BTN_CLASS = 'shrink-0';

/** Props for {@link ToggleIconButton}. */
interface ToggleIconButtonProps {
  readonly testId: string;
  readonly active: boolean;
  readonly onClick: () => void;
  readonly ariaLabel: string;
  readonly children: ReactNode;
}

/**
 * Renders one of the three icon-only mode toggles in the action row. Switches
 * to the `secondary` variant while active so the lit-up state is visually
 * distinct from the inactive `outline` resting state.
 */
function ToggleIconButton({ testId, active, onClick, ariaLabel, children }: ToggleIconButtonProps) {
  return (
    <Button
      data-testid={testId}
      variant={active ? 'secondary' : 'outline'}
      size="icon-sm"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={TOGGLE_BTN_CLASS}
    >
      {children}
    </Button>
  );
}

/** Props for the internal {@link ModeToggleRow} helper. */
interface ModeToggleRowProps {
  readonly isPickerActive: boolean;
  readonly isHighlightActive: boolean;
  readonly isReaderActive: boolean;
  readonly onPickerToggle: () => void;
  readonly onHighlightToggle: () => void;
  readonly onReaderToggle: () => void;
  readonly fmt: FormatMessageFn;
}

/** Renders the trio of icon-only mode toggles to the right of the Clip button. */
function ModeToggleRow({
  isPickerActive,
  isHighlightActive,
  isReaderActive,
  onPickerToggle,
  onHighlightToggle,
  onReaderToggle,
  fmt,
}: ModeToggleRowProps) {
  return (
    <>
      <ToggleIconButton
        testId="footer-picker-btn"
        active={isPickerActive}
        onClick={onPickerToggle}
        ariaLabel={fmt({ id: 'popup.footer.picker', defaultMessage: 'Section picker' })}
      >
        <PickerIcon />
      </ToggleIconButton>
      <ToggleIconButton
        testId="footer-highlight-btn"
        active={isHighlightActive}
        onClick={onHighlightToggle}
        ariaLabel={fmt({ id: 'popup.footer.highlight', defaultMessage: 'Highlight' })}
      >
        <HighlightIcon />
      </ToggleIconButton>
      <ToggleIconButton
        testId="footer-reader-btn"
        active={isReaderActive}
        onClick={onReaderToggle}
        ariaLabel={fmt({ id: 'popup.footer.reader', defaultMessage: 'Reader' })}
      >
        <ReaderIcon />
      </ToggleIconButton>
    </>
  );
}

/** Props for the internal {@link ClipButton} helper. */
interface ClipButtonProps {
  readonly isSaving: boolean;
  readonly isDisabled: boolean;
  readonly onSave: () => void;
  readonly fmt: FormatMessageFn;
}

/** Renders the primary "Clip Page" save action with optional saving spinner. */
function ClipButton({ isSaving, isDisabled, onSave, fmt }: ClipButtonProps) {
  const clipLabel = isSaving
    ? fmt({ id: 'popup.saving', defaultMessage: 'Saving…' })
    : fmt({ id: 'popup.clip', defaultMessage: 'Clip Page' });
  return (
    <Button
      data-testid="save-button"
      className="flex-1"
      disabled={isDisabled || isSaving}
      onClick={onSave}
    >
      {isSaving ? <SpinIcon /> : null}
      <span>{clipLabel}</span>
    </Button>
  );
}

/**
 * Footer bar for the popup. Combines the primary "Clip Page" action,
 * three icon-only mode toggles (section picker, highlight, reader), and the
 * {@link StatusBar} that reflects the current save-flow state. All state
 * arrives via props so the component is fully unit-testable; the parent
 * (popup composition root) wires it to {@link usePopupStore}.
 */
export function ActionFooter(props: ActionFooterProps) {
  const fmt = useFormatMessage();
  const {
    isSaving,
    isDisabled,
    onSave,
    saveStatus,
    saveDestinationLabel,
    isPickerActive,
    isHighlightActive,
    isReaderActive,
    onPickerToggle,
    onHighlightToggle,
    onReaderToggle,
  } = props;

  return (
    <div className="flex flex-col gap-1.5 px-2.5 py-2 border-t border-border bg-card">
      <div className="flex items-center gap-1.5">
        <ClipButton isSaving={isSaving} isDisabled={isDisabled} onSave={onSave} fmt={fmt} />
        <ModeToggleRow
          isPickerActive={isPickerActive}
          isHighlightActive={isHighlightActive}
          isReaderActive={isReaderActive}
          onPickerToggle={onPickerToggle}
          onHighlightToggle={onHighlightToggle}
          onReaderToggle={onReaderToggle}
          fmt={fmt}
        />
      </div>
      <StatusBar status={saveStatus} destinationLabel={saveDestinationLabel} />
    </div>
  );
}
