// src/presentation/components/EditableLabel.tsx

import { useRef, useState } from 'react';

/** Props for {@link EditableLabel}. */
export interface EditableLabelProps {
  /** Current display value. */
  readonly value: string;
  /**
   * Called with the trimmed new value when the user commits an edit.
   * Not called when the value is unchanged, when the input is empty, or when
   * the input contains only whitespace.
   */
  readonly onCommit: (next: string) => void;
  /** CSS class applied to both the static span and the edit input. */
  readonly className?: string;
  /** Inline styles applied to both the static span and the edit input. In edit mode, component-specific styles (border-bottom, background, etc.) take precedence over caller values. */
  readonly style?: React.CSSProperties;
  /** Accessible name for the static span's `role="button"`. Defaults to `value` if omitted. */
  readonly ariaLabel?: string;
}

/** Props for the internal {@link EditingInput} sub-component. */
interface EditingInputProps {
  /** Current draft value shown in the input. */
  readonly draft: string;
  /** Called when the draft value changes. */
  readonly onChange: (value: string) => void;
  /** Called when the edit session should commit (e.g. blur). */
  readonly onCommit: () => void;
  /** Called when the edit session should cancel (Escape key). */
  readonly onCancel: () => void;
  /** Optional CSS class forwarded from the parent. */
  readonly className?: string;
  /** Optional inline styles forwarded from the parent. */
  readonly style?: React.CSSProperties;
  /** Accessible name for the edit input. */
  readonly ariaLabel: string;
}

/**
 * Focused input rendered while the label is being edited. Commits on blur
 * and Enter; cancels on Escape.
 */
function EditingInput({
  draft,
  onChange,
  onCommit,
  onCancel,
  className,
  style,
  ariaLabel,
}: EditingInputProps) {
  return (
    <input
      autoFocus
      aria-label={ariaLabel}
      value={draft}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      className={className}
      style={{
        ...style,
        background: 'transparent',
        border: 'none',
        borderBottom: '1.5px solid var(--wh-accent)',
        outline: 'none',
        padding: '2px 0',
        width: '100%',
      }}
    />
  );
}

/** Props for the internal {@link StaticLabel} sub-component. */
interface StaticLabelProps {
  /** Text to display. */
  readonly value: string;
  /** Called when the user activates the label to begin editing. */
  readonly onStartEditing: () => void;
  /** Optional CSS class forwarded from the parent. */
  readonly className?: string;
  /** Optional inline styles forwarded from the parent. */
  readonly style?: React.CSSProperties;
  /** Accessible name for the span's `role="button"`. */
  readonly ariaLabel: string;
}

/**
 * Read-only span rendered when the label is not being edited. Clicking or
 * pressing Enter/Space activates edit mode.
 */
function StaticLabel({ value, onStartEditing, className, style, ariaLabel }: StaticLabelProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onStartEditing}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onStartEditing();
      }}
      className={className}
      style={{ cursor: 'text', ...style }}
    >
      {value}
    </span>
  );
}

/** Internal state returned by {@link useEditState}. */
interface EditState {
  /** Whether the label is currently in edit mode. */
  readonly isEditing: boolean;
  /** Current draft text in the input. */
  readonly draft: string;
  /** Switch to edit mode and seed the draft with the current value. */
  readonly startEditing: () => void;
  /** Commit the trimmed draft if non-empty and changed; exit edit mode. */
  readonly commit: () => void;
  /** Cancel the edit session without committing. */
  readonly cancel: () => void;
  /** Update the draft value. */
  readonly setDraft: (v: string) => void;
}

/** Encapsulates edit-mode state and transition handlers for {@link EditableLabel}. */
function useEditState(value: string, onCommit: (next: string) => void): EditState {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelledRef = useRef(false);

  const startEditing = (): void => {
    setDraft(value);
    cancelledRef.current = false;
    setIsEditing(true);
  };
  const commit = (): void => {
    if (cancelledRef.current) return;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    setIsEditing(false);
  };
  const cancel = (): void => {
    cancelledRef.current = true;
    setIsEditing(false);
  };

  return { isEditing, draft, startEditing, commit, cancel, setDraft };
}

/**
 * Click-to-edit inline text label. Renders as a static `<span>`; clicking it
 * switches to a focused `<input>`. Enter or blur commits; Escape cancels.
 * Empty or whitespace-only input reverts without committing.
 */
export function EditableLabel({
  value,
  onCommit,
  className,
  style,
  ariaLabel,
}: EditableLabelProps) {
  const { isEditing, draft, startEditing, commit, cancel, setDraft } = useEditState(
    value,
    onCommit,
  );
  const resolvedAriaLabel = ariaLabel ?? value;

  if (isEditing) {
    return (
      <EditingInput
        draft={draft}
        onChange={setDraft}
        onCommit={commit}
        onCancel={cancel}
        className={className}
        style={style}
        ariaLabel={resolvedAriaLabel}
      />
    );
  }
  return (
    <StaticLabel
      value={value}
      onStartEditing={startEditing}
      className={className}
      style={style}
      ariaLabel={resolvedAriaLabel}
    />
  );
}
