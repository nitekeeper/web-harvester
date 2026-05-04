// src/presentation/settings/Settings.tsx

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@presentation/components/ui/tabs';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';

import { DebugSection } from './sections/DebugSection';
import { DestinationsSection } from './sections/DestinationsSection';
import { GeneralSection } from './sections/GeneralSection';
import { TemplatesSection } from './sections/TemplatesSection';
import { ThemeSection } from './sections/ThemeSection';

/** Names of the five tabs surfaced by the settings SPA. */
type Tab = 'general' | 'destinations' | 'templates' | 'theme' | 'debug';

const TAB_DEFS: readonly { value: Tab; labelId: string; defaultLabel: string }[] = [
  { value: 'general', labelId: 'settings.nav.general', defaultLabel: 'General' },
  { value: 'destinations', labelId: 'settings.nav.destinations', defaultLabel: 'Destinations' },
  { value: 'templates', labelId: 'settings.nav.templates', defaultLabel: 'Templates' },
  { value: 'theme', labelId: 'settings.nav.theme', defaultLabel: 'Theme' },
  { value: 'debug', labelId: 'settings.nav.debug', defaultLabel: 'Debug' },
];

/**
 * Root component for the extension's options page (settings SPA). Lays out a
 * tabbed UI with five sections — general, destinations, templates, theme,
 * and debug. Sections render with safe inert defaults; state wiring (stores,
 * services) is deferred to the settings composition root in a later task,
 * mirroring the pattern used by `Popup`.
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
        <TabsList className="mb-6">
          {TAB_DEFS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {fmt({ id: tab.labelId, defaultMessage: tab.defaultLabel })}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="general">
          <GeneralSection />
        </TabsContent>
        <TabsContent value="destinations">
          <DestinationsSection />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesSection />
        </TabsContent>
        <TabsContent value="theme">
          <ThemeSection />
        </TabsContent>
        <TabsContent value="debug">
          <DebugSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
