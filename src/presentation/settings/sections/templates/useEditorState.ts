// src/presentation/settings/sections/templates/useEditorState.ts

import type React from 'react';
import { useCallback, useRef, useState } from 'react';

import type { TemplateConfig } from '@shared/types';

import type { BodyEditorHandle } from './BodyEditorField';
import { parseFrontmatter, serializeFrontmatter } from './frontmatterUtils';
import type { TemplateView } from './templateTypes';
import { useAutosave } from './useAutosave';

/** Holds the pending variable-picker target (which field + row + anchor position). */
export interface VarPickerTarget {
  readonly field: 'noteName' | 'frontmatter';
  readonly rowIndex?: number;
  /** Bounding rect of the trigger button, used to anchor the popover. */
  readonly anchorRect: DOMRect;
}

/** Local draft type mirroring template fields (excluding id). */
export type TemplateDraft = Omit<TemplateConfig, 'id'>;

/** Builds a fresh draft from a TemplateView. */
function draftFromTemplate(t: TemplateView): TemplateDraft {
  return {
    name: t.name,
    frontmatterTemplate: t.frontmatterTemplate,
    bodyTemplate: t.bodyTemplate,
    noteNameTemplate: t.noteNameTemplate,
  };
}

/** Returns a new string with `text` inserted at the current cursor selection in `el`. */
function insertTextAtCursor(el: HTMLInputElement, text: string): string {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  return el.value.slice(0, start) + text + el.value.slice(end);
}

/** Inserts `variable` at the cursor position of the note-name input element. */
function insertIntoNoteNameInput(variable: string, update: (v: string) => void): void {
  const el = document.getElementById('note-name-input') as HTMLInputElement | null;
  if (!el) return;
  update(insertTextAtCursor(el, variable));
}

/** Return value of {@link useEditorState}. */
export interface EditorState {
  /** Current draft of all template fields. */
  readonly draft: TemplateDraft;
  /** Whether the live preview panel is visible. */
  readonly previewOn: boolean;
  /** Which field the variable picker was opened for; null when closed. */
  readonly varPickerTarget: VarPickerTarget | null;
  /** Ref to the body editor instance for programmatic insertion. */
  readonly bodyEditorRef: React.RefObject<BodyEditorHandle | null>;
  /** Autosave status string for display in the header. */
  readonly autosaveStatus: ReturnType<typeof useAutosave>['status'];
  /** Updates one or more draft fields and triggers autosave. */
  readonly updateField: (changes: Partial<TemplateDraft>) => void;
  /** Inserts a variable at the cursor in the currently targeted field. */
  readonly handleInsertVariable: (variable: string) => void;
  /** Keyboard shortcut handler (Cmd+S to flush, Cmd+Enter to toggle preview). */
  readonly handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Setter for the preview visibility flag. */
  readonly setPreviewOn: React.Dispatch<React.SetStateAction<boolean>>;
  /** Setter for the variable picker target. */
  readonly setVarPickerTarget: React.Dispatch<React.SetStateAction<VarPickerTarget | null>>;
  /** Flushes pending autosave immediately. */
  readonly flush: () => void;
}

/** Builds the keyboard shortcut handler for Cmd+S (flush) and Cmd+Enter (preview toggle). */
function useEditorKeyDown(
  flush: () => void,
  setPreviewOn: React.Dispatch<React.SetStateAction<boolean>>,
): (e: React.KeyboardEvent) => void {
  return useCallback(
    (e: React.KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        flush();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        setPreviewOn((v) => !v);
      }
    },
    [flush, setPreviewOn],
  );
}

/** Resets the draft whenever the active template's id changes. */
function useDraftSync(
  template: TemplateView,
  setDraft: React.Dispatch<React.SetStateAction<TemplateDraft>>,
): void {
  const prevIdRef = useRef(template.id);
  if (prevIdRef.current !== template.id) {
    prevIdRef.current = template.id;
    setDraft(draftFromTemplate(template));
  }
}

/** Builds the save callback and autosave integration for the editor. */
function useEditorSave(
  template: TemplateView,
  draft: TemplateDraft,
  onUpdate: (id: string, changes: Partial<TemplateConfig>) => Promise<void>,
): { status: ReturnType<typeof useAutosave>['status']; trigger: () => void; flush: () => void } {
  const save = useCallback(async (): Promise<void> => {
    if (template.isSystem) return;
    await onUpdate(template.id, draft);
  }, [template.id, template.isSystem, draft, onUpdate]);
  return useAutosave(save);
}

/**
 * Inserts `variable` at the cursor position of the specified frontmatter value
 * input, then serializes the updated row back into `frontmatterTemplate`.
 */
function insertIntoFrontmatterValueInput(
  variable: string,
  rowIndex: number,
  frontmatterTemplate: string,
  updateField: (changes: Partial<TemplateDraft>) => void,
): void {
  const el = document.querySelector(
    `[data-testid="fm-value-${rowIndex}"]`,
  ) as HTMLInputElement | null;
  if (!el) return;
  const next = insertTextAtCursor(el, variable);
  const rows = parseFrontmatter(frontmatterTemplate);
  const updated = rows.map((r, i) => (i === rowIndex ? { ...r, value: next } : r));
  updateField({ frontmatterTemplate: serializeFrontmatter(updated) });
}

/** Builds the variable-insertion handler from current varPickerTarget state. */
function buildInsertVariableHandler(
  varPickerTarget: VarPickerTarget | null,
  draft: TemplateDraft,
  updateField: (changes: Partial<TemplateDraft>) => void,
  setVarPickerTarget: React.Dispatch<React.SetStateAction<VarPickerTarget | null>>,
): (variable: string) => void {
  return (variable: string): void => {
    if (!varPickerTarget) return;
    if (varPickerTarget.field === 'noteName') {
      insertIntoNoteNameInput(variable, (v) => updateField({ noteNameTemplate: v }));
    } else if (varPickerTarget.field === 'frontmatter' && varPickerTarget.rowIndex !== undefined) {
      insertIntoFrontmatterValueInput(
        variable,
        varPickerTarget.rowIndex,
        draft.frontmatterTemplate,
        updateField,
      );
    }
    setVarPickerTarget(null);
  };
}

/**
 * Owns all draft state, autosave, and derived callbacks for the template editor.
 * Extracts the stateful logic from {@link TemplateEditor} to keep the component lean.
 */
export function useEditorState(
  template: TemplateView,
  onUpdate: (id: string, changes: Partial<TemplateConfig>) => Promise<void>,
): EditorState {
  const [previewOn, setPreviewOn] = useState(false);
  const [varPickerTarget, setVarPickerTarget] = useState<VarPickerTarget | null>(null);
  const [draft, setDraft] = useState<TemplateDraft>(() => draftFromTemplate(template));
  useDraftSync(template, setDraft);
  const bodyEditorRef = useRef<BodyEditorHandle>(null);
  const { status, trigger, flush } = useEditorSave(template, draft, onUpdate);
  const updateField = useCallback(
    (changes: Partial<TemplateDraft>): void => {
      setDraft((prev) => ({ ...prev, ...changes }));
      trigger();
    },
    [trigger],
  );
  const handleInsertVariable = buildInsertVariableHandler(
    varPickerTarget,
    draft,
    updateField,
    setVarPickerTarget,
  );
  return {
    draft,
    previewOn,
    varPickerTarget,
    bodyEditorRef,
    autosaveStatus: status,
    updateField,
    handleInsertVariable,
    handleKeyDown: useEditorKeyDown(flush, setPreviewOn),
    setPreviewOn,
    setVarPickerTarget,
    flush,
  };
}
