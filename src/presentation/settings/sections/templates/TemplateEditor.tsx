// src/presentation/settings/sections/templates/TemplateEditor.tsx

import type React from 'react';
import { useCallback, useRef, useState } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { TemplateConfig } from '@shared/types';

import { BodyEditorField, type BodyEditorHandle } from './BodyEditorField';
import { EditorHeader } from './EditorHeader';
import { FrontmatterField } from './FrontmatterField';
import { LivePreview } from './LivePreview';
import { NoteNameField } from './NoteNameField';
import type { TemplateView } from './templateTypes';
import { useAutosave } from './useAutosave';
import { VariablePicker } from './VariablePicker';

/** Props for {@link TemplateEditor}. */
export interface TemplateEditorProps {
  /** Template to edit. */
  readonly template: TemplateView;
  /** Persists field changes for user templates. No-op for system templates. */
  readonly onUpdate: (id: string, changes: Partial<TemplateConfig>) => Promise<void>;
  /** Duplicates this template as a new user template. */
  readonly onDuplicate: (id: string) => void;
  /** Exports this template as a JSON download. */
  readonly onExport: (id: string) => void;
  /** Deletes this template (user templates only). */
  readonly onDelete: (id: string) => void;
}

/** Triggers a JSON file download for the given template. */
function exportTemplateJson(template: TemplateView): void {
  const data = JSON.stringify(
    {
      id: template.id,
      name: template.name,
      frontmatterTemplate: template.frontmatterTemplate,
      bodyTemplate: template.bodyTemplate,
      noteNameTemplate: template.noteNameTemplate,
    },
    null,
    2,
  );
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Holds the pending variable-picker target (which field + row). */
interface VarPickerTarget {
  readonly field: 'noteName' | 'frontmatter';
  readonly rowIndex?: number;
}

/** Local draft type mirroring template fields (excluding id). */
type TemplateDraft = Omit<TemplateConfig, 'id'>;

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
interface EditorState {
  readonly draft: TemplateDraft;
  readonly previewOn: boolean;
  readonly varPickerTarget: VarPickerTarget | null;
  readonly bodyEditorRef: React.RefObject<BodyEditorHandle | null>;
  readonly autosaveStatus: ReturnType<typeof useAutosave>['status'];
  readonly updateField: (changes: Partial<TemplateDraft>) => void;
  readonly handleInsertVariable: (variable: string) => void;
  readonly handleKeyDown: (e: React.KeyboardEvent) => void;
  readonly setPreviewOn: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setVarPickerTarget: React.Dispatch<React.SetStateAction<VarPickerTarget | null>>;
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

/** Owns all draft state, autosave, and derived callbacks for {@link TemplateEditor}. */
function useEditorState(
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

/** Props for {@link EditorFields}. */
interface EditorFieldsProps {
  readonly draft: TemplateDraft;
  readonly isSystem: boolean;
  readonly previewOn: boolean;
  readonly bodyEditorRef: React.RefObject<BodyEditorHandle | null>;
  readonly onUpdateField: (changes: Partial<TemplateDraft>) => void;
  readonly onOpenNoteNamePicker: () => void;
  readonly onOpenFrontmatterPicker: (rowIndex: number) => void;
}

/** Renders the three editable fields plus the live preview panel. */
function EditorFields({
  draft,
  isSystem,
  previewOn,
  bodyEditorRef,
  onUpdateField,
  onOpenNoteNamePicker,
  onOpenFrontmatterPicker,
}: EditorFieldsProps) {
  return (
    <>
      <NoteNameField
        value={draft.noteNameTemplate}
        readonly={isSystem}
        onChange={(noteNameTemplate) => onUpdateField({ noteNameTemplate })}
        onInsertVariable={onOpenNoteNamePicker}
      />
      <FrontmatterField
        value={draft.frontmatterTemplate}
        readonly={isSystem}
        onChange={(frontmatterTemplate) => onUpdateField({ frontmatterTemplate })}
        onInsertVariable={onOpenFrontmatterPicker}
      />
      <BodyEditorField
        ref={bodyEditorRef}
        value={draft.bodyTemplate}
        readonly={isSystem}
        onChange={(bodyTemplate) => onUpdateField({ bodyTemplate })}
      />
      <LivePreview open={previewOn} bodyTemplate={draft.bodyTemplate} />
    </>
  );
}

/** Props for {@link EditorScrollArea}. */
interface EditorScrollAreaProps extends EditorFieldsProps {
  readonly varPickerTarget: VarPickerTarget | null;
  readonly onCloseVarPicker: () => void;
  readonly onInsertVariable: (variable: string) => void;
}

/** Scrollable body of the editor: variable picker overlay + all fields. */
function EditorScrollArea({
  varPickerTarget,
  onCloseVarPicker,
  onInsertVariable,
  ...fieldProps
}: EditorScrollAreaProps) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        position: 'relative',
      }}
    >
      {varPickerTarget ? (
        <div style={{ position: 'absolute', top: 50, left: 22, zIndex: 200 }}>
          <VariablePicker open onInsert={onInsertVariable} onClose={onCloseVarPicker} />
        </div>
      ) : null}
      <EditorFields {...fieldProps} />
    </div>
  );
}

/** Props for {@link EditorA11yAnnouncer}. */
interface EditorA11yAnnouncerProps {
  readonly message: string;
}

/** Hidden live-region announcer for screen-reader accessibility. */
function EditorA11yAnnouncer({ message }: EditorA11yAnnouncerProps) {
  return (
    <div
      aria-live="polite"
      style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
    >
      {message}
    </div>
  );
}

/** Calls the onExport callback then triggers a JSON file download. */
function handleExport(template: TemplateView, onExport: (id: string) => void): void {
  onExport(template.id);
  exportTemplateJson(template);
}

/** Props for the header section of the editor pane. */
interface EditorPaneHeaderProps {
  readonly template: TemplateView;
  readonly draft: TemplateDraft;
  readonly autosaveStatus: EditorState['autosaveStatus'];
  readonly previewOn: boolean;
  readonly updateField: EditorState['updateField'];
  readonly setPreviewOn: EditorState['setPreviewOn'];
  readonly onDuplicate: (id: string) => void;
  readonly onExport: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

/** Renders the EditorHeader with all wired callbacks. */
function EditorPaneHeader({
  template,
  draft,
  autosaveStatus,
  previewOn,
  updateField,
  setPreviewOn,
  onDuplicate,
  onExport,
  onDelete,
}: EditorPaneHeaderProps) {
  return (
    <EditorHeader
      template={{ ...template, name: draft.name }}
      autosaveStatus={autosaveStatus}
      previewOn={previewOn}
      onNameChange={(name) => updateField({ name })}
      onPreviewToggle={() => setPreviewOn((v) => !v)}
      onDuplicate={() => onDuplicate(template.id)}
      onExport={() => handleExport(template, onExport)}
      onDelete={() => onDelete(template.id)}
    />
  );
}

/** Props for {@link EditorPane}. */
interface EditorPaneProps extends EditorState {
  readonly template: TemplateView;
  readonly onDuplicate: (id: string) => void;
  readonly onExport: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly readyMessage: string;
}

/** Props for {@link EditorPaneScroll}. */
interface EditorPaneScrollProps {
  readonly state: EditorState;
  readonly template: TemplateView;
  readonly closeVarPicker: () => void;
  readonly openNoteNamePicker: () => void;
  readonly openFmPicker: (rowIndex: number) => void;
  readonly readyMessage: string;
}

/** Renders the scrollable section and a11y announcer of the editor pane. */
function EditorPaneScroll({
  state: s,
  template,
  closeVarPicker,
  openNoteNamePicker,
  openFmPicker,
  readyMessage,
}: EditorPaneScrollProps) {
  return (
    <>
      <EditorScrollArea
        varPickerTarget={s.varPickerTarget}
        draft={s.draft}
        isSystem={template.isSystem}
        previewOn={s.previewOn}
        bodyEditorRef={s.bodyEditorRef}
        onCloseVarPicker={closeVarPicker}
        onInsertVariable={s.handleInsertVariable}
        onUpdateField={s.updateField}
        onOpenNoteNamePicker={openNoteNamePicker}
        onOpenFrontmatterPicker={openFmPicker}
      />
      {s.varPickerTarget === null ? <EditorA11yAnnouncer message={readyMessage} /> : null}
    </>
  );
}

/** Renders the full editor pane layout using pre-wired state and callbacks. */
function EditorPane({
  template,
  onDuplicate,
  onExport,
  onDelete,
  readyMessage,
  ...s
}: EditorPaneProps) {
  const closeVarPicker = () => s.setVarPickerTarget(null);
  const openNoteNamePicker = () => s.setVarPickerTarget({ field: 'noteName' });
  const openFmPicker = (rowIndex: number) =>
    s.setVarPickerTarget({ field: 'frontmatter', rowIndex });
  return (
    <div
      data-testid="template-editor"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onKeyDown={s.handleKeyDown}
    >
      <EditorPaneHeader
        template={template}
        draft={s.draft}
        autosaveStatus={s.autosaveStatus}
        previewOn={s.previewOn}
        updateField={s.updateField}
        setPreviewOn={s.setPreviewOn}
        onDuplicate={onDuplicate}
        onExport={onExport}
        onDelete={onDelete}
      />
      <EditorPaneScroll
        state={s}
        template={template}
        closeVarPicker={closeVarPicker}
        openNoteNamePicker={openNoteNamePicker}
        openFmPicker={openFmPicker}
        readyMessage={readyMessage}
      />
    </div>
  );
}

/**
 * Editor pane for a single template. Owns local draft state, wires up
 * autosave, and coordinates the variable picker with all three editable fields.
 */
export function TemplateEditor({
  template,
  onUpdate,
  onDuplicate,
  onExport,
  onDelete,
}: TemplateEditorProps) {
  const fmt = useFormatMessage();
  const state = useEditorState(template, onUpdate);
  const readyMessage = fmt({ id: 'settings.templates.editorReady', defaultMessage: '' });
  return (
    <EditorPane
      {...state}
      template={template}
      onDuplicate={onDuplicate}
      onExport={onExport}
      onDelete={onDelete}
      readyMessage={readyMessage}
    />
  );
}
