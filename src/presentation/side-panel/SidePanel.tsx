// src/presentation/side-panel/SidePanel.tsx

import { useState } from 'react';

import { WHLogo } from '@presentation/components/WHLogo';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { DestinationSelector } from '@presentation/popup/components/DestinationSelector';
import { MarkdownPreview } from '@presentation/popup/components/MarkdownPreview';
import { SaveButton } from '@presentation/popup/components/SaveButton';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

import { HighlightsTab } from './components/HighlightsTab';

/** Tabs available in the side panel. */
type SidePanelTab = 'highlights' | 'reader' | 'clip';

/** Props for {@link SidePanel}. */
export interface SidePanelProps {
  /** Called when the user clicks the close button. Defaults to `window.close`. */
  readonly onClose?: () => void;
  /** Called when the user clicks the Clip Page / Save button. */
  readonly onSave: () => void;
}

/** Close (×) icon 14 × 14 px. */
function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/** Header bar with logo, title, and close button. */
function SidePanelHeader({ onClose }: { readonly onClose: () => void }) {
  const fmt = useFormatMessage();
  return (
    <div
      data-testid="sidepanel-header"
      className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card shrink-0"
    >
      <WHLogo size={22} className="text-primary shrink-0" />
      <span className="text-[12.5px] font-semibold flex-1">
        {fmt({ id: 'sidepanel.header.title', defaultMessage: 'Web Harvester' })}
      </span>
      <button
        data-testid="sidepanel-close-btn"
        onClick={onClose}
        aria-label={fmt({ id: 'sidepanel.header.close', defaultMessage: 'Close panel' })}
        className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:bg-muted transition-colors"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

/** Descriptor for a single tab in the side panel tab bar. */
interface TabDescriptor {
  readonly id: SidePanelTab;
  readonly labelId: string;
  readonly defaultLabel: string;
}

const TABS: readonly TabDescriptor[] = [
  { id: 'highlights', labelId: 'sidepanel.tab.highlights', defaultLabel: 'Highlights' },
  { id: 'reader', labelId: 'sidepanel.tab.reader', defaultLabel: 'Reader' },
  { id: 'clip', labelId: 'sidepanel.tab.clip', defaultLabel: 'Clip' },
];

/** Tab bar that switches between Highlights / Reader / Clip. */
function TabBar({
  activeTab,
  onTab,
}: {
  readonly activeTab: SidePanelTab;
  readonly onTab: (tab: SidePanelTab) => void;
}) {
  const fmt = useFormatMessage();
  return (
    <div role="tablist" className="flex border-b border-border px-2 shrink-0">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeTab === t.id}
          data-testid={`sidepanel-tab-${t.id}`}
          onClick={() => onTab(t.id)}
          className={`px-3 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
            activeTab === t.id
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {fmt({ id: t.labelId, defaultMessage: t.defaultLabel })}
        </button>
      ))}
    </div>
  );
}

/** Content shown on the Clip tab — the existing save workflow UI. */
function ClipTab({ onSave }: { readonly onSave: () => void }) {
  const destinations = useSettingsStore((s) => s.destinations);
  const selectedDestinationId = usePopupStore((s) => s.selectedDestinationId);
  const previewMarkdown = usePopupStore((s) => s.previewMarkdown);
  const isSaving = usePopupStore((s) => s.isSaving);
  const setSelectedDestinationId = usePopupStore((s) => s.setSelectedDestinationId);

  return (
    <div className="flex flex-col gap-3 p-3">
      <DestinationSelector
        destinations={destinations}
        selectedId={selectedDestinationId}
        onSelect={setSelectedDestinationId}
      />
      <MarkdownPreview markdown={previewMarkdown} />
      <SaveButton isSaving={isSaving} isDisabled={selectedDestinationId === null} onSave={onSave} />
    </div>
  );
}

/** Placeholder body shown on the Highlights and Reader tabs. */
function PlaceholderTab({
  messageId,
  defaultMessage,
}: {
  readonly messageId: string;
  readonly defaultMessage: string;
}) {
  const fmt = useFormatMessage();
  return (
    <p className="p-4 text-sm text-muted-foreground italic">
      {fmt({ id: messageId, defaultMessage })}
    </p>
  );
}

/**
 * Root component for the Chrome side panel. Renders a persistent header with
 * the WHLogo and a close button, a three-tab bar (Highlights / Reader / Clip),
 * and tab content. The Clip tab hosts the existing clipping workflow;
 * Highlights and Reader are placeholders for future features.
 *
 * The `onSave` callback is supplied by the side-panel composition root, which
 * owns the `chrome.runtime` IPC wiring per CLAUDE.md and ADR-022.
 */
export function SidePanel({ onClose = () => window.close(), onSave }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<SidePanelTab>('clip');

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden border-l border-border">
      <SidePanelHeader onClose={onClose} />
      <TabBar activeTab={activeTab} onTab={setActiveTab} />
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'highlights' && <HighlightsTab />}
        {activeTab === 'reader' && (
          <PlaceholderTab
            messageId="sidepanel.tab.reader.placeholder"
            defaultMessage="Reader mode controls will appear here."
          />
        )}
        {activeTab === 'clip' && <ClipTab onSave={onSave} />}
      </div>
    </div>
  );
}
