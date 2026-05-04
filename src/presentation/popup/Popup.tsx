// src/presentation/popup/Popup.tsx

import { useCallback } from 'react';

import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

import { DestinationSelector } from './components/DestinationSelector';
import { MarkdownPreview } from './components/MarkdownPreview';
import { PickerToggle } from './components/PickerToggle';
import { SaveButton } from './components/SaveButton';
import { TemplateSelector } from './components/TemplateSelector';
import { ToolbarSlot } from './components/ToolbarSlot';

const NOOP = (): void => undefined;

/** Aggregates store state and derived handlers needed by {@link Popup}. */
function usePopupBindings() {
  const { destinations, templates } = useSettingsStore();
  const {
    selectedDestinationId,
    setSelectedDestinationId,
    selectedTemplateId,
    setSelectedTemplateId,
    isPickerActive,
    setPickerActive,
    previewMarkdown,
    isSaving,
  } = usePopupStore();

  const handlePickerToggle = useCallback(() => {
    setPickerActive(!isPickerActive);
  }, [isPickerActive, setPickerActive]);

  return {
    destinations,
    templates,
    selectedDestinationId,
    setSelectedDestinationId,
    selectedTemplateId,
    setSelectedTemplateId,
    handlePickerToggle,
    isPickerActive,
    previewMarkdown,
    isSaving,
  };
}

/**
 * Root component for the browser-action popup. Wires store state from
 * {@link usePopupStore} and {@link useSettingsStore} into the toolbar slot,
 * destination/template selectors, picker toggle, markdown preview, and save
 * button. Save action wiring is deferred to the popup composition root (Tasks
 * 47+) — the button is disabled until a destination is selected.
 */
export function Popup() {
  const {
    destinations,
    templates,
    selectedDestinationId,
    setSelectedDestinationId,
    selectedTemplateId,
    setSelectedTemplateId,
    handlePickerToggle,
    isPickerActive,
    previewMarkdown,
    isSaving,
  } = usePopupBindings();

  return (
    <div className="w-80 min-h-48 p-4 bg-background text-foreground flex flex-col gap-3">
      <ToolbarSlot />
      <DestinationSelector
        destinations={destinations}
        selectedId={selectedDestinationId}
        onSelect={setSelectedDestinationId}
      />
      <TemplateSelector
        templates={templates}
        selectedId={selectedTemplateId}
        onSelect={setSelectedTemplateId}
      />
      <PickerToggle isActive={isPickerActive} onToggle={handlePickerToggle} />
      <MarkdownPreview markdown={previewMarkdown} />
      <SaveButton isSaving={isSaving} isDisabled={selectedDestinationId === null} onSave={NOOP} />
    </div>
  );
}
