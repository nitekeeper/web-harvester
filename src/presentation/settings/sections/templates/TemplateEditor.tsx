// src/presentation/settings/sections/templates/TemplateEditor.tsx

import type React from 'react';
import { useCallback, useRef } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import type { TemplateConfig } from '@shared/types';

import { BodyEditorField, type BodyEditorHandle } from './BodyEditorField';
import { EditorHeader } from './EditorHeader';
import { FrontmatterField } from './FrontmatterField';
import { LivePreview } from './LivePreview';
import { NoteNameField } from './NoteNameField';
import { PickElementButton } from './PickElementButton';
import type { TemplateView } from './templateTypes';
import { useCssPicker } from './useCssPicker';
import {
  type EditorState,
  type TemplateDraft,
  type VarPickerTarget,
  useEditorState,
} from './useEditorState';
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

/** Props for {@link EditorFields}. */
interface EditorFieldsProps {
  readonly draft: TemplateDraft;
  readonly isSystem: boolean;
  readonly previewOn: boolean;
  readonly bodyEditorRef: React.RefObject<BodyEditorHandle | null>;
  readonly onUpdateField: (changes: Partial<TemplateDraft>) => void;
  readonly onOpenNoteNamePicker: () => void;
  readonly onOpenFrontmatterPicker: (rowIndex: number) => void;
  /** Whether a CSS pick session is active (disables the Pick element button). */
  readonly isPicking: boolean;
  /** Start a CSS pick session targeting the frontmatter field. */
  readonly onPickFrontmatter: () => void;
  /** Start a CSS pick session targeting the body field. */
  readonly onPickBody: () => void;
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
  isPicking,
  onPickFrontmatter,
  onPickBody,
}: EditorFieldsProps) {
  return (
    <>
      <NoteNameField
        value={draft.noteNameTemplate}
        readonly={isSystem}
        onChange={(noteNameTemplate) => onUpdateField({ noteNameTemplate })}
        onInsertVariable={onOpenNoteNamePicker}
      />
      <PickElementButton isPicking={isPicking} onClick={onPickFrontmatter} />
      <FrontmatterField
        value={draft.frontmatterTemplate}
        readonly={isSystem}
        onChange={(frontmatterTemplate) => onUpdateField({ frontmatterTemplate })}
        onInsertVariable={onOpenFrontmatterPicker}
      />
      <PickElementButton isPicking={isPicking} onClick={onPickBody} />
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
  /** Whether a CSS pick session is active. */
  readonly isPicking: boolean;
  /** Start a CSS pick session targeting the frontmatter field. */
  readonly onPickFrontmatter: () => void;
  /** Start a CSS pick session targeting the body field. */
  readonly onPickBody: () => void;
}

/** Props for {@link EditorPaneScroll}. */
interface EditorPaneScrollProps {
  readonly state: EditorState;
  readonly template: TemplateView;
  readonly readyMessage: string;
  /** Whether a CSS pick session is active. */
  readonly isPicking: boolean;
  /** Start a CSS pick session targeting the frontmatter field. */
  readonly onPickFrontmatter: () => void;
  /** Start a CSS pick session targeting the body field. */
  readonly onPickBody: () => void;
}

/** Renders the scrollable section and a11y announcer of the editor pane. */
function EditorPaneScroll({
  state: s,
  template,
  readyMessage,
  isPicking,
  onPickFrontmatter,
  onPickBody,
}: EditorPaneScrollProps) {
  const closeVarPicker = () => s.setVarPickerTarget(null);
  const openNoteNamePicker = () => s.setVarPickerTarget({ field: 'noteName' });
  const openFmPicker = (rowIndex: number) =>
    s.setVarPickerTarget({ field: 'frontmatter', rowIndex });
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
        isPicking={isPicking}
        onPickFrontmatter={onPickFrontmatter}
        onPickBody={onPickBody}
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
  isPicking,
  onPickFrontmatter,
  onPickBody,
  ...s
}: EditorPaneProps) {
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
        readyMessage={readyMessage}
        isPicking={isPicking}
        onPickFrontmatter={onPickFrontmatter}
        onPickBody={onPickBody}
      />
    </div>
  );
}

/** Return value of {@link usePickerCallbacks}. */
interface PickerCallbacks {
  readonly isPicking: boolean;
  readonly onPickFrontmatter: () => void;
  readonly onPickBody: () => void;
}

/**
 * Wires the CSS picker for the template editor.
 * Uses a draftRef to keep onPickResult stable across renders so the
 * chrome.storage listener is only attached once per session.
 */
function usePickerCallbacks(state: EditorState): PickerCallbacks {
  const draftRef = useRef(state.draft);
  draftRef.current = state.draft;

  const onPickResult = useCallback(
    (field: 'frontmatter' | 'body', variable: string): void => {
      const d = draftRef.current;
      if (field === 'frontmatter') {
        state.updateField({ frontmatterTemplate: d.frontmatterTemplate + variable });
      } else {
        state.updateField({ bodyTemplate: d.bodyTemplate + variable });
      }
    },
    // state.updateField is already memoized in useEditorState so this is stable
    [state.updateField],
  );

  const { isPicking, handlePickElement } = useCssPicker(onPickResult);

  const onPickFrontmatter = useCallback(
    () => handlePickElement('frontmatter'),
    [handlePickElement],
  );
  const onPickBody = useCallback(() => handlePickElement('body'), [handlePickElement]);

  return { isPicking, onPickFrontmatter, onPickBody };
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
  const { isPicking, onPickFrontmatter, onPickBody } = usePickerCallbacks(state);

  return (
    <EditorPane
      {...state}
      template={template}
      onDuplicate={onDuplicate}
      onExport={onExport}
      onDelete={onDelete}
      readyMessage={readyMessage}
      isPicking={isPicking}
      onPickFrontmatter={onPickFrontmatter}
      onPickBody={onPickBody}
    />
  );
}
