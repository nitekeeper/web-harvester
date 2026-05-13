// src/presentation/settings/Settings.tsx

import { type ReactNode, useState } from 'react';

import {
  FolderIcon,
  FileIcon,
  AppearanceIcon,
  AboutIcon,
  PluginIcon,
} from '@presentation/components/icons';
import { Tabs, TabsContent } from '@presentation/components/ui/tabs';
import { WHLogo } from '@presentation/components/WHLogo';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';

import { AboutSection } from './sections/AboutSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { DestinationsSection } from './sections/DestinationsSection';
import { PluginsSection } from './sections/PluginsSection';
import { TemplatesSection } from './sections/TemplatesSection';
import { useDestinationHandlers } from './useDestinationHandlers';
import { useTemplateHandlers } from './useTemplateHandlers';

/** Names of the five tabs surfaced by the settings SPA. */
type Tab = 'destinations' | 'templates' | 'appearance' | 'plugins' | 'about';

const TAB_DEFS: readonly {
  value: Tab;
  labelId: string;
  defaultLabel: string;
  icon: ReactNode;
}[] = [
  {
    value: 'destinations',
    labelId: 'settings.nav.destinations',
    defaultLabel: 'Destinations',
    icon: <FolderIcon />,
  },
  {
    value: 'templates',
    labelId: 'settings.nav.templates',
    defaultLabel: 'Templates',
    icon: <FileIcon />,
  },
  {
    value: 'appearance',
    labelId: 'settings.nav.appearance',
    defaultLabel: 'Appearance',
    icon: <AppearanceIcon />,
  },
  {
    value: 'plugins',
    labelId: 'settings.nav.plugins',
    defaultLabel: 'Plugins',
    icon: <PluginIcon />,
  },
  {
    value: 'about',
    labelId: 'settings.nav.about',
    defaultLabel: 'About',
    icon: <AboutIcon />,
  },
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
        <div className="text-[12.5px] font-semibold tracking-[-0.01em]">
          {fmt({ id: 'settings.header.title', defaultMessage: 'Web Harvester' })}
        </div>
        <div className="text-[10.5px] text-muted-foreground">
          {fmt({ id: 'settings.header.subtitle', defaultMessage: 'Settings · v0.1.0' })}
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
        {TAB_DEFS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onTab(tab.value)}
              className={`w-full text-left px-3 py-2 rounded-md text-[12.5px] transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-muted text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab.icon !== null ? (
                <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                  {tab.icon}
                </span>
              ) : null}
              {fmt({ id: tab.labelId, defaultMessage: tab.defaultLabel })}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Renders the destinations and templates tab panels with their wired props. */
function DataPanels() {
  const destinations = useSettingsStore((s) => s.destinations);
  const primaryId = useSettingsStore((s) => s.settings.defaultDestinationId);
  const templates = useSettingsStore((s) => s.templates);
  const destHandlers = useDestinationHandlers();
  const templateHandlers = useTemplateHandlers();
  return (
    <>
      <TabsContent value="destinations">
        <DestinationsSection
          destinations={destinations}
          primaryId={primaryId}
          onAdd={destHandlers.onAdd}
          onRemove={destHandlers.onRemove}
          onSetPrimary={destHandlers.onSetPrimary}
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

/** Renders all five tab content panels. */
function SectionPanels() {
  const plugins = useSettingsStore((s) => s.plugins);
  return (
    <>
      <DataPanels />
      <TabsContent value="appearance">
        <AppearanceSection />
      </TabsContent>
      <TabsContent value="plugins">
        <PluginsSection plugins={plugins} />
      </TabsContent>
      <TabsContent value="about">
        <AboutSection />
      </TabsContent>
    </>
  );
}

/**
 * Root component for the extension's options page. Uses a two-column layout:
 * a fixed 200 px left sidebar with WHLogo branding and vertical tab navigation,
 * and a scrollable right column hosting the active section panel. Pulls the
 * destinations, templates, and plugins slices from the singleton settings store
 * and the section handlers from `useDestinationHandlers` and
 * `useTemplateHandlers` (via `SectionPanels`); the singleton itself is hydrated
 * by the settings composition root before the React tree mounts (see ADR-022).
 */
export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('destinations');

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
