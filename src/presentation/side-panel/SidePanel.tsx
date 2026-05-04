// src/presentation/side-panel/SidePanel.tsx

import { DestinationSelector } from '@presentation/popup/components/DestinationSelector';
import { MarkdownPreview } from '@presentation/popup/components/MarkdownPreview';
import { SaveButton } from '@presentation/popup/components/SaveButton';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

/**
 * Root component for the Chrome side-panel surface. Renders a compact
 * clipping UI by reusing the popup's destination selector, save button, and
 * markdown preview components, omitting the broader settings navigation so
 * the side panel stays focused on the clip-now workflow. State comes from
 * the shared `usePopupStore` and `useSettingsStore` singletons; storage sync
 * is wired by the side-panel composition root in a later task.
 */
export function SidePanel() {
  const destinations = useSettingsStore((s) => s.destinations);
  const selectedDestinationId = usePopupStore((s) => s.selectedDestinationId);
  const selectedTemplateId = usePopupStore((s) => s.selectedTemplateId);
  const previewMarkdown = usePopupStore((s) => s.previewMarkdown);
  const isSaving = usePopupStore((s) => s.isSaving);
  const setSelectedDestinationId = usePopupStore((s) => s.setSelectedDestinationId);

  /**
   * Sends a `SAVE_CLIP` message to the background service worker, asking it
   * to commit the current clip using the in-store destination/template ids.
   * Direct `chrome.runtime.sendMessage` is the documented IPC boundary for
   * the side-panel — the background-side handler will route the request
   * through the application services. Disabled when no destination is
   * selected or a save is already in flight.
   */
  function handleSave(): void {
    /* eslint-disable-next-line no-restricted-syntax -- IPC boundary: side panel calls chrome.runtime directly per the plan. */
    chrome.runtime.sendMessage({
      type: 'SAVE_CLIP',
      destinationId: selectedDestinationId,
      templateId: selectedTemplateId,
    });
  }

  return (
    <div className="w-full min-h-screen p-3 bg-background text-foreground flex flex-col gap-3">
      <DestinationSelector
        destinations={destinations}
        selectedId={selectedDestinationId}
        onSelect={setSelectedDestinationId}
      />
      <MarkdownPreview markdown={previewMarkdown} />
      <SaveButton
        isSaving={isSaving}
        isDisabled={selectedDestinationId === null}
        onSave={handleSave}
      />
    </div>
  );
}
