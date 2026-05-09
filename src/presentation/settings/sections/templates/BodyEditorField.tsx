// src/presentation/settings/sections/templates/BodyEditorField.tsx
//
// CodeMirror 6 editor for the template body. Uses markdown language support
// plus a custom MatchDecorator for {{variable}} and {% tag %} tokens.
// Background and syntax colors are hardcoded per the design handoff — they
// must NOT use --wh-* tokens and must NOT vary with the active theme.

import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import {
  HighlightStyle,
  LanguageDescription,
  LanguageSupport,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  lineNumbers,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

/** The imperative handle exposed to parent components. */
export interface BodyEditorHandle {
  /** Inserts `text` at the current cursor position. */
  insertAtCursor: (text: string) => void;
}

/** Props for {@link BodyEditorField}. */
export interface BodyEditorFieldProps {
  /** Current template body string. */
  readonly value: string;
  /** Whether the editor is read-only (system templates). */
  readonly readonly?: boolean;
  /** Called whenever the editor content changes. */
  readonly onChange: (value: string) => void;
}

// Syntax highlight style (locked — do not use --wh-* vars here)

const whHighlightStyle = HighlightStyle.define([
  {
    tag: [tags.heading1, tags.heading2, tags.heading3, tags.heading4, tags.heading5, tags.heading6],
    color: '#d2a8ff',
    fontWeight: '600',
  },
  { tag: tags.quote, color: '#a5d6ff' },
  { tag: tags.monospace, color: '#7ee787' },
  { tag: tags.meta, color: '#8b949e' },
  { tag: tags.comment, color: '#8b949e' },
]);

// Custom decorators for {{variable}} and {% tag %} tokens.
// Bounded quantifiers ({0,200}) prevent ReDoS on long inputs.

const variableDeco = Decoration.mark({ class: 'cm-wh-variable' });
const tagDeco = Decoration.mark({ class: 'cm-wh-tag' });

const variableDecorator = new MatchDecorator({
  regexp: /\{\{[^}]{0,200}\}\}/g,
  decoration: () => variableDeco,
});
const tagDecorator = new MatchDecorator({
  regexp: /\{%[^%]{0,200}%\}/g,
  decoration: () => tagDeco,
});

/**
 * Creates a ViewPlugin that applies a MatchDecorator to the editor view.
 */
function makeDecoratorPlugin(decorator: MatchDecorator): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }

      update(update: ViewUpdate): void {
        this.decorations = decorator.updateDeco(update, this.decorations);
      }
    },
    { decorations: (v) => v.decorations },
  );
}

// Base theme (locked colors — intentionally hardcoded, not --wh-* tokens)

const whBaseTheme = EditorView.theme({
  '&': {
    background: '#0d1117',
    color: '#c9d1d9',
    borderRadius: '6px',
    maxHeight: '420px',
  },
  '.cm-content': {
    padding: '12px 14px',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    fontSize: '12px',
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    background: '#0d1117',
    borderRight: '1px solid #21262d',
    color: '#484f58',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px' },
  '.cm-focused': { outline: 'none' },
  '.cm-wh-variable': { color: '#79c0ff' },
  '.cm-wh-tag': { color: '#ff7b72' },
  '.cm-cursor': { borderLeftColor: '#c9d1d9' },
  '.cm-selectionBackground': { background: 'rgba(121,192,255,0.15)' },
  '&.cm-focused .cm-selectionBackground': {
    background: 'rgba(121,192,255,0.2)',
  },
});

/** Builds the CodeMirror extension array for the template body editor. */
function buildExtensions(onChange: (value: string) => void, isReadonly: boolean): Extension[] {
  const extensions: Extension[] = [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    lineNumbers(),
    markdown({
      base: markdownLanguage,
      codeLanguages: [
        LanguageDescription.of({
          name: 'markdown',
          alias: [],
          extensions: [],
          load: async () => new LanguageSupport(markdownLanguage),
        }),
      ],
    }),
    syntaxHighlighting(whHighlightStyle),
    makeDecoratorPlugin(variableDecorator),
    makeDecoratorPlugin(tagDecorator),
    whBaseTheme,
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) onChange(update.state.doc.toString());
    }),
  ];
  if (isReadonly) extensions.push(EditorState.readOnly.of(true));
  return extensions;
}

/** Style for the "Content Template" label above the editor. */
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--wh-muted)',
};

/** Style for the container div wrapping the CodeMirror editor. */
const editorWrapStyle: React.CSSProperties = {
  border: '1px solid var(--wh-border)',
  borderRadius: 6,
  overflow: 'hidden',
};

/** Props for the internal {@link BodyEditorLabel} component. */
interface BodyEditorLabelProps {
  /** Formatted label string to render. */
  readonly label: string;
}

/** Renders the uppercase label above the CodeMirror editor. */
function BodyEditorLabel({ label }: BodyEditorLabelProps) {
  return <span style={labelStyle}>{label}</span>;
}

/** Mounts the CodeMirror editor and wires up effects for value sync. */
function useEditorMount(
  containerRef: React.RefObject<HTMLDivElement | null>,
  viewRef: React.MutableRefObject<EditorView | null>,
  value: string,
  onChange: (v: string) => void,
  isReadonly: boolean,
): void {
  // Mount editor once on initial render
  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: buildExtensions(onChange, isReadonly),
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally omit onChange/isReadonly — stable on mount; value sync handled separately
  }, []);

  // Sync external value changes (e.g. switching selected template)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value, viewRef]);
}

/**
 * CodeMirror 6 editor for template body content. Supports markdown syntax
 * plus `{{variable}}` and `{%tag%}` highlighting. Exposes an
 * `insertAtCursor` handle via `ref` for the variable picker.
 */
export const BodyEditorField = forwardRef<BodyEditorHandle, BodyEditorFieldProps>(
  function BodyEditorField({ value, readonly: isReadonly = false, onChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const fmt = useFormatMessage();

    useEditorMount(containerRef, viewRef, value, onChange, isReadonly);

    useImperativeHandle(ref, () => ({
      insertAtCursor(text: string): void {
        const view = viewRef.current;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });
        view.focus();
      },
    }));

    const label = fmt({
      id: 'settings.templates.bodyEditorLabel',
      defaultMessage: 'Content Template',
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <BodyEditorLabel label={label} />
        <div ref={containerRef} data-testid="body-editor" style={editorWrapStyle} />
      </div>
    );
  },
);
