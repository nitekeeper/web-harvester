import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

import { FIXTURE_PAGE, hasIllegalFilenameChars, resolveNoteNamePattern } from './noteNamePreview';

/** Props for {@link NoteNameField}. */
export interface NoteNameFieldProps {
  /** Current note-name pattern value. */
  readonly value: string;
  /** Whether the field is read-only (system templates). */
  readonly readonly?: boolean;
  /** Called when the pattern changes. */
  readonly onChange: (value: string) => void;
  /** Called when the user clicks "Insert {{...}}" in the label. */
  readonly onInsertVariable: () => void;
}

/** Shared CSS style objects extracted to keep functions under 40 lines. */
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--wh-muted)',
};

/** Input style for the note-name pattern text field. */
const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--wh-border)',
  borderRadius: 5,
  padding: '7px 10px',
  fontSize: 12,
  fontFamily: 'var(--wh-mono)',
  background: 'var(--wh-panel)',
  color: 'var(--wh-text)',
  boxSizing: 'border-box',
};

/** Props for {@link NoteNameLabelRow}. */
interface NoteNameLabelRowProps {
  /** Whether the insert-variable button should be hidden. */
  readonly isReadonly: boolean;
  /** Called when the user clicks the insert-variable button. */
  readonly onInsertVariable: () => void;
}

/** Renders the label row above the note-name input, including the insert-variable button. */
function NoteNameLabelRow({ isReadonly, onInsertVariable }: NoteNameLabelRowProps) {
  const fmt = useFormatMessage();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <label htmlFor="note-name-input" style={labelStyle}>
        {fmt({ id: 'settings.templates.noteNameLabel', defaultMessage: 'Note Name Pattern' })}
      </label>
      {!isReadonly ? (
        <button
          onClick={onInsertVariable}
          style={{
            background: 'transparent',
            border: 0,
            fontSize: 11,
            color: 'var(--wh-accent)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {fmt({ id: 'settings.templates.insertVariable', defaultMessage: 'Insert {{…}}' })}
        </button>
      ) : null}
    </div>
  );
}

/** Props for {@link NoteNamePreview}. */
interface NoteNamePreviewProps {
  /** The resolved note name after variable substitution. */
  readonly resolved: string;
  /** Whether the resolved name contains illegal filename characters. */
  readonly hasError: boolean;
}

/** Renders the live preview line beneath the note-name input. */
function NoteNamePreview({ resolved, hasError }: NoteNamePreviewProps) {
  const fmt = useFormatMessage();
  const color = hasError ? 'var(--wh-danger)' : 'var(--wh-subtle)';
  const preview = hasError
    ? fmt({
        id: 'settings.templates.noteNameError',
        defaultMessage: '→ contains illegal characters',
      })
    : fmt({
        id: 'settings.templates.noteNamePreview',
        defaultMessage: '→ {name}.md',
        values: { name: resolved },
      });
  return (
    <span
      data-testid="note-name-preview"
      style={{ fontSize: 10.5, fontFamily: 'var(--wh-mono)', color }}
    >
      {preview}
    </span>
  );
}

/**
 * NOTE NAME PATTERN field with a live resolved preview line below the input.
 * The preview is resolved against `FIXTURE_PAGE`; if the resolved name
 * contains illegal filename characters the preview turns danger-red.
 */
export function NoteNameField({
  value,
  readonly: isReadonly = false,
  onChange,
  onInsertVariable,
}: NoteNameFieldProps) {
  const resolved = resolveNoteNamePattern(value, FIXTURE_PAGE);
  const hasError = hasIllegalFilenameChars(resolved);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <NoteNameLabelRow isReadonly={isReadonly} onInsertVariable={onInsertVariable} />
      <input
        id="note-name-input"
        data-testid="note-name-input"
        value={value}
        readOnly={isReadonly}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      <NoteNamePreview resolved={resolved} hasError={hasError} />
    </div>
  );
}
