// src/presentation/popup/Popup.tsx

import { DestinationSelector } from './components/DestinationSelector';
import { MarkdownPreview } from './components/MarkdownPreview';
import { PickerToggle } from './components/PickerToggle';
import { SaveButton } from './components/SaveButton';
import { TemplateSelector } from './components/TemplateSelector';
import { ToolbarSlot } from './components/ToolbarSlot';

const NOOP = (): void => undefined;

/**
 * Root component for the browser-action popup. Lays out the toolbar slot,
 * destination/template selectors, picker toggle, markdown preview, and save
 * button into a fixed-width vertical stack. State wiring (stores, services)
 * is intentionally deferred to the popup composition root added in a later
 * task — this component currently renders with safe inert defaults so the
 * UI shell can be built and tested in isolation.
 */
export function Popup() {
  return (
    <div className="w-80 min-h-48 p-4 bg-background text-foreground flex flex-col gap-3">
      <ToolbarSlot />
      <DestinationSelector destinations={[]} selectedId={null} onSelect={NOOP} />
      <TemplateSelector templates={[]} selectedId={null} onSelect={NOOP} />
      <PickerToggle isActive={false} onToggle={NOOP} />
      <MarkdownPreview markdown="" />
      <SaveButton isSaving={false} isDisabled onSave={NOOP} />
    </div>
  );
}
