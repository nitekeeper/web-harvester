// src/presentation/settings/Settings.tsx

import { useState } from 'react';

import { Tabs, TabsContent } from '@presentation/components/ui/tabs';
import { WHLogo } from '@presentation/components/WHLogo';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

import { DebugSection } from './sections/DebugSection';
import { DestinationsSection } from './sections/DestinationsSection';
import { GeneralSection } from './sections/GeneralSection';
import { TemplatesSection } from './sections/TemplatesSection';
import { ThemeSection } from './sections/ThemeSection';
import { useDestinationHandlers } from './useDestinationHandlers';
import { useTemplateHandlers } from './useTemplateHandlers';

/** Names of the five tabs surfaced by the settings SPA. */
type Tab = 'general' | 'destinations' | 'templates' | 'theme' | 'debug';

const TAB_DEFS: readonly { value: Tab; labelId: string; defaultLabel: string }[] = [
  { value: 'general', labelId: 'settings.nav.general', defaultLabel: 'General' },
  { value: 'destinations', labelId: 'settings.nav.destinations', defaultLabel: 'Destinations' },
  { value: 'templates', labelId: 'settings.nav.templates', defaultLabel: 'Templates' },
  { value: 'theme', labelId: 'settings.nav.theme', defaultLabel: 'Theme' },
  { value: 'debug', labelId: 'settings.nav.debug', defaultLabel: 'Debug' },
];

/** Props for {@link SidebarNav}. */
interface SidebarNavProps {
  /** Currently active tab. */
  readonly activeTab: Tab;
  /** Called when a nav item is clicked. */
  readonly onTab: (tab: Tab) => void;
}

/** Renders the WHLogo + branding header at the top of the sidebar. */
function SidebarBranding() {
  const fmt = useFormatMessage();
  return (
    <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
      <WHLogo size={26} className="text-primary shrink-0" />
      <div>
        <div className="text-[13px] font-semibold tracking-tight">
          {fmt({ id: 'settings.header.title', defaultMessage: 'Web Harvester' })}
        </div>
        <div className="text-[10.5px] text-muted-foreground">
          {fmt({ id: 'settings.header.subtitle', defaultMessage: 'Settings' })}
        </div>
      </div>
    </div>
  );
}

/** Left sidebar navigation for the settings page. */
function SidebarNav({ activeTab, onTab }: SidebarNavProps) {
  const fmt = useFormatMessage();
  return (
    <div
      data-testid="settings-sidebar"
      className="w-[200px] shrink-0 border-r border-border bg-card flex flex-col"
    >
      <SidebarBranding />
      <nav className="flex flex-col gap-px p-3">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTab(tab.value)}
            className={`w-full text-left px-3 py-2 rounded-md text-[12.5px] transition-colors ${
              activeTab === tab.value
                ? 'bg-muted text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {fmt({ id: tab.labelId, defaultMessage: tab.defaultLabel })}
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Renders the destinations and templates tab panels with their wired props. */
function DataPanels() {
  const destinations = useSettingsStore((s) => s.destinations);
  const templates = useSettingsStore((s) => s.templates);
  const destHandlers = useDestinationHandlers();
  const templateHandlers = useTemplateHandlers();
  return (
    <>
      <TabsContent value="destinations">
        <DestinationsSection
          destinations={destinations}
          onAdd={destHandlers.onAdd}
          onRemove={destHandlers.onRemove}
          onRename={destHandlers.onRename}
        />
      </TabsContent>
      <TabsContent value="templates">
        <TemplatesSection
          templates={templates}
          onAdd={templateHandlers.onAdd}
          onRemove={templateHandlers.onRemove}
          onUpdate={templateHandlers.onUpdate}
        />
      </TabsContent>
    </>
  );
}

/** Renders the five tab content panels. */
function SectionPanels() {
  return (
    <>
      <TabsContent value="general">
        <GeneralSection />
      </TabsContent>
      <DataPanels />
      <TabsContent value="theme">
        <ThemeSection />
      </TabsContent>
      <TabsContent value="debug">
        <DebugSection />
      </TabsContent>
    </>
  );
}

/**
 * Root component for the extension's options page. Uses a two-column layout:
 * a fixed 200 px left sidebar with WHLogo branding and vertical tab navigation,
 * and a scrollable right column hosting the active section panel. Pulls the
 * destinations and templates slices from the singleton settings store and the
 * section handlers from `useDestinationHandlers` and `useTemplateHandlers`
 * (via `SectionPanels`); the singleton itself is hydrated by the settings
 * composition root before the React tree mounts (see ADR-022).
 */
export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <SidebarNav activeTab={activeTab} onTab={setActiveTab} />
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <SectionPanels />
        </Tabs>
      </div>
    </div>
  );
}
