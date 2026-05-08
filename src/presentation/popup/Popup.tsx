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
  /** Called when the user clicks the highlight toggle; triggers IPC to background. Defaults to no-op. */
  readonly onHighlightToggle?: () => void;
  /** Called when the selected template changes; triggers a live-preview re-fetch. Defaults to no-op. */
  readonly onTemplateChange?: () => void;
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
  /** When true and no fields are present, shows a loading skeleton. */
  readonly isPreviewing: boolean;
}

/**
 * Renders the labeled PROPERTIES group containing the {@link PropertiesEditor}.
 * Extracted to keep {@link PopupScrollBody} within the 40-line function limit.
 */
function PropertiesSection({ markdown, onMarkdownChange, isPreviewing }: PropertiesSectionProps) {
  const fmt = useFormatMessage();
  return (
    <div className="flex flex-col gap-1" role="group" aria-labelledby="popup-properties-label">
      <span id="popup-properties-label" className={LABEL_CLASS}>
        {fmt({ id: 'popup.propertiesLabel', defaultMessage: 'PROPERTIES' })}
      </span>
      <PropertiesEditor
        markdown={markdown}
        onMarkdownChange={onMarkdownChange}
        isPreviewing={isPreviewing}
      />
    </div>
  );
}

/** Props for the {@link DestinationTemplateGroups} sub-component. */
interface DestinationTemplateGroupsProps {
  /** Popup store slice needed for selectors. */
  readonly popup: PopupStoreState;
  /** Called when the selected template changes; triggers a live-preview re-fetch. */
  readonly onTemplateChange?: () => void;
}

/**
 * Renders the DESTINATION and TEMPLATE labeled groups side-by-side.
 * Extracted to keep {@link PopupScrollBody} within the 40-line function limit.
 */
function DestinationTemplateGroups({ popup, onTemplateChange }: DestinationTemplateGroupsProps) {
  const fmt = useFormatMessage();
  const { destinations, templates } = useSettingsStore();
  const handleTemplateSelect = useCallback(
    (id: string) => {
      popup.setSelectedTemplateId(id);
      onTemplateChange?.();
    },
    [popup, onTemplateChange],
  );
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
          onSelect={handleTemplateSelect}
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

/** Props for the {@link PopupScrollBody} sub-component. */
interface PopupScrollBodyProps {
  /** Called when the selected template changes; triggers a live-preview re-fetch. */
  readonly onTemplateChange?: () => void;
}

/**
 * Renders the popup body: selector area (toolbar + destination/template pickers)
 * above a scrollable region (properties editor + preview). The selector area has
 * no overflow clipping so Radix Select dropdowns can extend beyond it without
 * being clipped — the Chrome extension popup window expands to show them.
 */
function PopupScrollBody({ onTemplateChange }: PopupScrollBodyProps) {
  const fmt = useFormatMessage();
  const popup = usePopupStore();
  return (
    <div className="flex-1 flex flex-col">
      <div className="relative px-3 pt-3 flex flex-col gap-3">
        <ToolbarSlot />
        <DestinationTemplateGroups popup={popup} onTemplateChange={onTemplateChange} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-3 flex flex-col gap-3">
        <PropertiesSection
          markdown={popup.previewMarkdown}
          onMarkdownChange={popup.setPreviewMarkdown}
          isPreviewing={popup.isPreviewing}
        />
        <div className="flex flex-col gap-1" role="group" aria-labelledby="popup-preview-label">
          <span id="popup-preview-label" className={LABEL_CLASS}>
            {fmt({ id: 'popup.previewLabel', defaultMessage: 'PREVIEW' })}
          </span>
          <MarkdownPreview markdown={popup.previewMarkdown} isPreviewing={popup.isPreviewing} />
        </div>
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
export function Popup({
  onSave,
  onSettings,
  onReaderToggle = NOOP_TOGGLE,
  onHighlightToggle = NOOP_TOGGLE,
  onTemplateChange,
}: PopupProps) {
  const { theme, handleTheme } = useSettingsBindings();
  const { popup, handlePickerToggle } = usePopupBindings();

  return (
    <div className="w-80 min-h-48 bg-background text-foreground flex flex-col">
      <PopupHeader theme={theme} onTheme={handleTheme} onSettings={onSettings} />
      <PopupScrollBody onTemplateChange={onTemplateChange} />
      <ActionFooter
        isSaving={popup.isSaving}
        isDisabled={popup.selectedDestinationId === null}
        onSave={onSave}
        isPickerActive={popup.isPickerActive}
        isHighlightActive={popup.isHighlightActive}
        isReaderActive={popup.isReaderActive}
        onPickerToggle={handlePickerToggle}
        onHighlightToggle={onHighlightToggle}
        onReaderToggle={onReaderToggle}
        saveStatus={popup.saveStatus}
        saveDestinationLabel={popup.saveDestinationLabel}
      />
    </div>
  );
}
