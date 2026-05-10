// src/presentation/settings/sections/CustomCssField.tsx

import { useCallback, useEffect, useRef, useState } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

/** Save state for the custom CSS editor. */
export type SaveState = 'saved' | 'saving' | 'invalid';

/** Default seed content shown when no custom CSS is saved. */
export const DEFAULT_CSS_SEED = `/* Override any token */\n:root {\n  --color-primary: #5b21b6;\n  --radius-card: 8px;\n}\n`;

const INDICATOR_COLOR_SAVED = '#10b981';
const INDICATOR_COLOR_INVALID = '#ef4444';
const INDICATOR_COLOR_MUTED = '#8b949e';
const CSS_FILENAME = 'custom.css';

/** Returns the indicator color for a given save state. */
function indicatorColor(state: SaveState): string {
  if (state === 'saved') return INDICATOR_COLOR_SAVED;
  if (state === 'invalid') return INDICATOR_COLOR_INVALID;
  return INDICATOR_COLOR_MUTED;
}

/** Creates or returns the shared custom-CSS style element injected into document head. */
function getOrCreateStyleEl(): HTMLStyleElement {
  const existing = document.getElementById('wh-custom-css');
  if (existing instanceof HTMLStyleElement) return existing;
  const el = document.createElement('style');
  el.id = 'wh-custom-css';
  document.head.appendChild(el);
  return el;
}

/** Injects CSS into the document and returns a save state based on parse heuristic. */
export function injectAndValidateCss(css: string): SaveState {
  const el = getOrCreateStyleEl();
  el.textContent = css;
  if (css.trim() === '') return 'saved';
  const ruleCount = el.sheet?.cssRules.length ?? 0;
  const braceCount = (css.match(/{/g) ?? []).length;
  return braceCount === 0 || ruleCount >= braceCount ? 'saved' : 'invalid';
}

/** Dot indicator + label for autosave status. */
function SaveIndicator({ state }: { readonly state: SaveState }) {
  const label = state === 'saving' ? 'saving…' : state;
  const color = indicatorColor(state);
  return (
    <span
      aria-live="polite"
      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color }}
    >
      <span
        style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }}
      />
      {label}
    </span>
  );
}

/** Filename + save-indicator left cluster inside the CSS editor header. */
function CssEditorFilename({ saveState }: { readonly saveState: SaveState }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--wh-mono)', fontSize: 10.5, color: '#8b949e' }}>
        {CSS_FILENAME}
      </span>
      <SaveIndicator state={saveState} />
    </div>
  );
}

/** Reset button inside the CSS editor header. */
function CssResetButton({
  onReset,
  label,
}: {
  readonly onReset: () => void;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label={label}
      style={{
        background: 'transparent',
        border: 0,
        color: '#8b949e',
        fontSize: 10.5,
        padding: '2px 6px',
        borderRadius: 4,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = '#c9d1d9';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = '#8b949e';
      }}
    >
      {label}
    </button>
  );
}

/** Header strip for the CSS editor with filename, save indicator, and reset button. */
function CssEditorHeader({
  saveState,
  resetLabel,
  onReset,
}: {
  readonly saveState: SaveState;
  readonly resetLabel: string;
  readonly onReset: () => void;
}) {
  return (
    <div
      style={{
        background: '#161b22',
        borderBottom: '1px solid var(--wh-border)',
        padding: '6px 10px 6px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <CssEditorFilename saveState={saveState} />
      <CssResetButton onReset={onReset} label={resetLabel} />
    </div>
  );
}

/** Textarea with editor styling for custom CSS input. */
function CssTextarea({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      spellCheck={false}
      style={{
        display: 'block',
        width: '100%',
        background: '#0d1117',
        border: 0,
        outline: 'none',
        resize: 'vertical',
        padding: 14,
        minHeight: 140,
        color: '#c9d1d9',
        caretColor: 'var(--wh-accent)',
        fontFamily: 'var(--wh-mono)',
        fontSize: 11.5,
        lineHeight: 1.6,
        boxSizing: 'border-box',
      }}
    />
  );
}

/** Return shape of the useCssEditor hook. */
interface CssEditorState {
  localValue: string;
  saveState: SaveState;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleReset: () => void;
}

/** Manages debounced autosave state for the custom CSS editor. */
function useCssEditor(value: string, onChange: (v: string) => void): CssEditorState {
  const [localValue, setLocalValue] = useState(value === '' ? DEFAULT_CSS_SEED : value);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(
    (css: string) => {
      const state = injectAndValidateCss(css);
      onChange(css);
      setSaveState(state);
    },
    [onChange],
  );

  const schedule = useCallback(
    (css: string) => {
      setSaveState('saving');
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flush(css), 600);
    },
    [flush],
  );

  useEffect(() => {
    if (value !== '') injectAndValidateCss(value);
    // mount-only effect: inject persisted CSS once; value intentionally omitted from deps
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const css = e.target.value;
    setLocalValue(css);
    schedule(css);
  };

  const handleReset = () => {
    setLocalValue(DEFAULT_CSS_SEED);
    schedule(DEFAULT_CSS_SEED);
  };

  return { localValue, saveState, handleChange, handleReset };
}

/** Debounced CSS editor with autosave, validation, and CSS injection on mount. */
export function CustomCssField({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
}) {
  const fmt = useFormatMessage();
  const { localValue, saveState, handleChange, handleReset } = useCssEditor(value, onChange);
  const resetLabel = fmt({
    id: 'settings.appearance.customCss.reset',
    defaultMessage: 'Reset to default',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--wh-muted)',
        }}
      >
        {fmt({ id: 'settings.appearance.customCss', defaultMessage: 'Custom CSS' })}
      </span>
      <div
        style={{
          background: '#0d1117',
          border: '1px solid var(--wh-border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <CssEditorHeader saveState={saveState} resetLabel={resetLabel} onReset={handleReset} />
        <CssTextarea value={localValue} onChange={handleChange} />
      </div>
    </div>
  );
}
