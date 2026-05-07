// src/presentation/popup/Popup.tsx

import { useCallback } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { type PopupStoreState, usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

import { ActionFooter } from './components/ActionFooter';
import { DestinationSelector } from './components/DestinationSelector';
import { MarkdownPreview } from './components/MarkdownPreview';
import { PopupHeader } from './components/PopupHeader';
import { PropertiesEditor } from './components/PropertiesEditor';
import { TemplateSelector } from './components/TemplateSelector';
import { ToolbarSlot } from './components/ToolbarSlot';

const NOOP_TOGGLE = (): void => undefined;

/** Shared classes for the small uppercase section labels in the popup body. */
const LABEL_CLASS = 'text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground';

/** Props for the {@link Popup} root component. */
export interface PopupProps {
  /** Called when the user clicks the Clip Page button. */
  readonly onSave: () => void;
  /** Called when the user clicks the settings gear icon. */
  readonly onSettings: () => void;
  /** Called when the user clicks the reader-mode toggle; triggers IPC to background. Defaults to no-op. */
  readonly onReaderToggle?: () => void;
}

/** Reads the slice of {@link useSettingsStore} that the popup root cares about. */
function useSettingsBindings() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const handleTheme = useCallback(
    (next: 'light' | 'dark' | 'system') => updateSettings({ theme: next }),
    [updateSettings],
  );
  return { theme, handleTheme };
}

/** Props for the {@link PropertiesSection} sub-component. */
interface PropertiesSectionProps {
  /** Current markdown string, including frontmatter. */
  readonly markdown: string;
  /** Called when the user edits a frontmatter field. */
  readonly onMarkdownChange: (next: string) => void;
}

/**
 * Renders the labeled PROPERTIES group containing the {@link PropertiesEditor}.
 * Extracted to keep {@link PopupScrollBody} within the 40-line function limit.
 */
function PropertiesSection({ markdown, onMarkdownChange }: PropertiesSectionProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex flex-col gap-1" role="group" aria-labelledby="popup-properties-label">
      <span id="popup-properties-label" className={LABEL_CLASS}>
        {fmt({ id: 'popup.propertiesLabel', defaultMessage: 'PROPERTIES' })}
      </span>
      <PropertiesEditor markdown={markdown} onMarkdownChange={onMarkdownChange} />
    </div>
  );
}

/** Props for the {@link DestinationTemplateGroups} sub-component. */
interface DestinationTemplateGroupsProps {
  /** Popup store slice needed for selectors. */
  readonly popup: PopupStoreState;
}

/**
 * Renders the DESTINATION and TEMPLATE labeled groups side-by-side.
 * Extracted to keep {@link PopupScrollBody} within the 40-line function limit.
 */
function DestinationTemplateGroups({ popup }: DestinationTemplateGroupsProps) {
  const fmt = useFormatMessage();
  const { destinations, templates } = useSettingsStore();
  return (
    <>
      <div className="flex flex-col gap-1" role="group" aria-labelledby="popup-destination-label">
        <span id="popup-destination-label" className={LABEL_CLASS}>
          {fmt({ id: 'popup.destinationLabel', defaultMessage: 'DESTINATION' })}
        </span>
        <DestinationSelector
          destinations={destinations}
          selectedId={popup.selectedDestinationId}
          onSelect={popup.setSelectedDestinationId}
        />
      </div>
      <div className="flex flex-col gap-1" role="group" aria-labelledby="popup-template-label">
        <span id="popup-template-label" className={LABEL_CLASS}>
          {fmt({ id: 'popup.templateLabel', defaultMessage: 'TEMPLATE' })}
        </span>
        <TemplateSelector
          templates={templates}
          selectedId={popup.selectedTemplateId}
          onSelect={popup.setSelectedTemplateId}
        />
      </div>
    </>
  );
}

/** Reads the slice of {@link usePopupStore} that the popup root cares about. */
function usePopupBindings() {
  const popup = usePopupStore();
  const { isPickerActive, setPickerActive } = popup;
  const handlePickerToggle = useCallback(
    () => setPickerActive(!isPickerActive),
    [isPickerActive, setPickerActive],
  );
  return { popup, handlePickerToggle };
}

/**
 * Renders the scrollable body section of the popup: toolbar slot, destination
 * selector, template selector, optional properties editor (when frontmatter is
 * present), and markdown preview — each with a small uppercase label. Reads
 * directly from the popup and settings stores.
 */
function PopupScrollBody() {
  const fmt = useFormatMessage();
  const popup = usePopupStore();
  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <ToolbarSlot />
      <DestinationTemplateGroups popup={popup} />
      <PropertiesSection
        markdown={popup.previewMarkdown}
        onMarkdownChange={popup.setPreviewMarkdown}
      />
      <div className="flex flex-col gap-1" role="group" aria-labelledby="popup-preview-label">
        <span id="popup-preview-label" className={LABEL_CLASS}>
          {fmt({ id: 'popup.previewLabel', defaultMessage: 'PREVIEW' })}
        </span>
        <MarkdownPreview markdown={popup.previewMarkdown} />
      </div>
    </div>
  );
}

/**
 * Root component for the browser-action popup. Renders the header (logo +
 * theme toggle + settings), the body (toolbar slot, destination / template
 * selectors, markdown preview), and the action footer (Clip Page button +
 * mode toggles + status bar).
 *
 * The `onSave`, `onSettings`, and `onReaderToggle` callbacks are supplied by
 * the composition root in `popup/index.tsx`; `onSave` triggers the IPC clip
 * workflow, `onSettings` opens the extension options page, and `onReaderToggle`
 * sends an IPC toggle-reader message to the background service worker —
 * see ADR-022 for the rationale.
 */
export function Popup({ onSave, onSettings, onReaderToggle = NOOP_TOGGLE }: PopupProps) {
  const { theme, handleTheme } = useSettingsBindings();
  const { popup, handlePickerToggle } = usePopupBindings();

  return (
    <div className="w-80 min-h-48 bg-background text-foreground flex flex-col">
      <PopupHeader theme={theme} onTheme={handleTheme} onSettings={onSettings} />
      <PopupScrollBody />
      <ActionFooter
        isSaving={popup.isSaving}
        isDisabled={popup.selectedDestinationId === null}
        onSave={onSave}
        isPickerActive={popup.isPickerActive}
        isHighlightActive={false}
        isReaderActive={popup.isReaderActive}
        onPickerToggle={handlePickerToggle}
        onHighlightToggle={NOOP_TOGGLE}
        onReaderToggle={onReaderToggle}
        saveStatus={popup.saveStatus}
        saveDestinationLabel={popup.saveDestinationLabel}
      />
    </div>
  );
}
