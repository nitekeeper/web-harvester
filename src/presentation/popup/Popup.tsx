// src/presentation/popup/Popup.tsx

import { useCallback } from 'react';

import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

import { ActionFooter } from './components/ActionFooter';
import { DestinationSelector } from './components/DestinationSelector';
import { MarkdownPreview } from './components/MarkdownPreview';
import { PopupHeader } from './components/PopupHeader';
import { TemplateSelector } from './components/TemplateSelector';
import { ToolbarSlot } from './components/ToolbarSlot';

const NOOP = (): void => undefined;

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
 * Root component for the browser-action popup. Renders the header (logo +
 * theme toggle + settings), the body (toolbar slot, destination / template
 * selectors, markdown preview), and the action footer (Clip Page button +
 * mode toggles + status bar). The `onSave` action is wired by the composition
 * root in `popup/index.tsx` — the button is disabled when no destination is
 * selected.
 *
 * The `onSettings` callback opens the extension options page; passing `NOOP`
 * here because the composition root (index.tsx) must supply
 * `chrome.runtime.openOptionsPage` — see ADR-022 for the rationale.
 */
export function Popup() {
  const { destinations, templates, theme, handleTheme } = useSettingsBindings();
  const { popup, handlePickerToggle } = usePopupBindings();

  return (
    <div className="w-80 min-h-48 bg-background text-foreground flex flex-col">
      <PopupHeader theme={theme} onTheme={handleTheme} onSettings={NOOP} />
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        <ToolbarSlot />
        <DestinationSelector
          destinations={destinations}
          selectedId={popup.selectedDestinationId}
          onSelect={popup.setSelectedDestinationId}
        />
        <TemplateSelector
          templates={templates}
          selectedId={popup.selectedTemplateId}
          onSelect={popup.setSelectedTemplateId}
        />
        <MarkdownPreview markdown={popup.previewMarkdown} />
      </div>
      <ActionFooter
        isSaving={popup.isSaving}
        isDisabled={popup.selectedDestinationId === null}
        onSave={NOOP}
        isPickerActive={popup.isPickerActive}
        isHighlightActive={false}
        isReaderActive={false}
        onPickerToggle={handlePickerToggle}
        onHighlightToggle={NOOP}
        onReaderToggle={NOOP}
        saveStatus={popup.saveStatus}
        saveDestinationLabel={popup.saveDestinationLabel}
      />
    </div>
  );
}
