// src/presentation/settings/sections/templates/useEditorState.ts

import type React from 'react';
import { useCallback, useRef, useState } from 'react';

import type { TemplateConfig } from '@shared/types';

import type { BodyEditorHandle } from './BodyEditorField';
import type { TemplateView } from './templateTypes';
import { useAutosave } from './useAutosave';

/** Holds the pending variable-picker target (which field + row). */
export interface VarPickerTarget {
  readonly field: 'noteName' | 'frontmatter';
  readonly rowIndex?: number;
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

/** Inserts `variable` at the cursor position of the note-name input element. */
function insertIntoNoteNameInput(variable: string, update: (v: string) => void): void {
  const el = document.getElementById('note-name-input') as HTMLInputElement | null;
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + variable + el.value.slice(end);
  update(next);
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

/** Builds the variable-insertion handler from current varPickerTarget state. */
function buildInsertVariableHandler(
  varPickerTarget: VarPickerTarget | null,
  updateField: (changes: Partial<TemplateDraft>) => void,
  setVarPickerTarget: React.Dispatch<React.SetStateAction<VarPickerTarget | null>>,
): (variable: string) => void {
  return (variable: string): void => {
    if (!varPickerTarget) return;
    if (varPickerTarget.field === 'noteName') {
      insertIntoNoteNameInput(variable, (v) => updateField({ noteNameTemplate: v }));
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
  const prevIdRef = useRef(template.id);
  if (prevIdRef.current !== template.id) {
    prevIdRef.current = template.id;
    setDraft(draftFromTemplate(template));
  }
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
