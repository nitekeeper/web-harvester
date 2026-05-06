// src/presentation/popup/Popup.tsx

import { useCallback } from 'react';

import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

import { ActionFooter } from './components/ActionFooter';
import { DestinationSelector } from './components/DestinationSelector';
import { MarkdownPreview } from './components/MarkdownPreview';
import { PopupHeader } from './components/PopupHeader';
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
}

/** Reads the slice of {@link useSettingsStore} that the popup root cares about. */
function useSettingsBindings() {
  const { destinations, templates } = useSettingsStore();
  const theme = useSettingsStore((s) => s.settings.theme);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const handleTheme = useCallback(
    (next: 'light' | 'dark' | 'system') => updateSettings({ theme: next }),
    [updateSettings],
  );
  return { destinations, templates, theme, handleTheme };
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
 * selector, template selector, and markdown preview — each with a small
 * uppercase label. Reads directly from the popup and settings stores.
 */
function PopupScrollBody() {
  const fmt = useFormatMessage();
  const { destinations, templates } = useSettingsStore();
  const popup = usePopupStore();

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <ToolbarSlot />
      <div className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>
          {fmt({ id: 'popup.destinationLabel', defaultMessage: 'DESTINATION' })}
        </span>
        <DestinationSelector
          destinations={destinations}
          selectedId={popup.selectedDestinationId}
          onSelect={popup.setSelectedDestinationId}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>
          {fmt({ id: 'popup.templateLabel', defaultMessage: 'TEMPLATE' })}
        </span>
        <TemplateSelector
          templates={templates}
          selectedId={popup.selectedTemplateId}
          onSelect={popup.setSelectedTemplateId}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>
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
 * The `onSave` and `onSettings` callbacks are supplied by the composition
 * root in `popup/index.tsx`; `onSave` triggers the IPC clip workflow and the
 * Clip Page button is disabled when no destination is selected, and
 * `onSettings` opens the extension options page via the chrome adapter — see
 * ADR-022 for the rationale.
 */
export function Popup({ onSave, onSettings }: PopupProps) {
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
        isReaderActive={false}
        onPickerToggle={handlePickerToggle}
        onHighlightToggle={NOOP_TOGGLE}
        onReaderToggle={NOOP_TOGGLE}
        saveStatus={popup.saveStatus}
        saveDestinationLabel={popup.saveDestinationLabel}
      />
    </div>
  );
}
