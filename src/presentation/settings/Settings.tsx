// src/presentation/settings/Settings.tsx

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@presentation/components/ui/tabs';
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

/** Renders the tab triggers row, mapped from `TAB_DEFS`. */
function TabHeaders() {
  const fmt = useFormatMessage();
  return (
    <TabsList className="mb-6">
      {TAB_DEFS.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value}>
          {fmt({ id: tab.labelId, defaultMessage: tab.defaultLabel })}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

/** Renders the five tab panels with their wired sections. */
function SectionPanels() {
  const destinations = useSettingsStore((s) => s.destinations);
  const templates = useSettingsStore((s) => s.templates);
  const destHandlers = useDestinationHandlers();
  const templateHandlers = useTemplateHandlers();
  return (
    <>
      <TabsContent value="general">
        <GeneralSection />
      </TabsContent>
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
 * Root component for the extension's options page (settings SPA). Lays out a
 * tabbed UI with five sections — general, destinations, templates, theme,
 * and debug. Pulls the destinations and templates slices from the singleton
 * settings store and the section handlers from `useDestinationHandlers` and
 * `useTemplateHandlers` (via `SectionPanels`); the singleton itself is
 * hydrated by the settings composition root before the React tree mounts
 * (see ADR-022).
 */
export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const fmt = useFormatMessage();

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">
        {fmt({ id: 'settings.title', defaultMessage: 'Web Harvester — Settings' })}
      </h1>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabHeaders />
        <SectionPanels />
      </Tabs>
    </div>
  );
}
