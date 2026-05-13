// src/presentation/components/EditableLabel.tsx

import { useRef, useState } from 'react';

/** Props for {@link EditableLabel}. */
export interface EditableLabelProps {
  /** Current display value. */
  readonly value: string;
  /**
   * Called with the trimmed new value when the user commits an edit.
   * Not called when the value is unchanged or when the input is empty.
   */
  readonly onCommit: (next: string) => void;
  /** CSS class applied to both the static span and the edit input. */
  readonly className?: string;
  /** Inline styles applied to both the static span and the edit input. */
  readonly style?: React.CSSProperties;
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
}: EditingInputProps) {
  return (
    <input
      autoFocus
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
}

/**
 * Read-only span rendered when the label is not being edited. Clicking or
 * pressing Enter/Space activates edit mode.
 */
function StaticLabel({ value, onStartEditing, className, style }: StaticLabelProps) {
  return (
    <span
      role="button"
      tabIndex={0}
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

/**
 * Click-to-edit inline text label. Renders as a static `<span>`; clicking it
 * switches to a focused `<input>`. Enter or blur commits; Escape cancels.
 * Empty or whitespace-only input reverts without committing.
 */
export function EditableLabel({ value, onCommit, className, style }: EditableLabelProps) {
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

  if (isEditing) {
    return (
      <EditingInput
        draft={draft}
        onChange={setDraft}
        onCommit={commit}
        onCancel={cancel}
        className={className}
        style={style}
      />
    );
  }

  return (
    <StaticLabel value={value} onStartEditing={startEditing} className={className} style={style} />
  );
}
