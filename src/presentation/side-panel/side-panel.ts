// src/presentation/side-panel/side-panel.ts
//
// Side-panel SPA composition root. Mirrors the popup wiring — bootstraps
// both singleton stores from chrome.storage before mounting the React tree.
// See ADR-022 for the cross-layer ESLint carve-out covering this file.

import 'reflect-metadata';

import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import type { Highlight } from '@application/HighlightService';
import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import { ensureWritable } from '@infrastructure/fsa/fsa';
import { createDestinationStorage } from '@infrastructure/storage/destinations';
import { createSaveHandler } from '@presentation/hooks/useSaveHandler';
import '@presentation/styles/global.css';
import { bootstrapStore } from '@presentation/stores/bootstrapStore';
import { useHighlightsStore } from '@presentation/stores/useHighlightsStore';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';
import { createLogger } from '@shared/logger';

import { SidePanel } from './SidePanel';

const logger = createLogger('side-panel');

async function init(): Promise<void> {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element not found');

  const adapter = new ChromeAdapter();
  await Promise.all([
    bootstrapStore(adapter, 'settings-state', useSettingsStore, {
      serialize: (s) => ({ settings: s.settings, templates: s.templates }),
    }),
    bootstrapStore(adapter, 'popup-state', usePopupStore),
  ]);

  const currentUrl = usePopupStore.getState().activeTab?.url;
  if (currentUrl) {
    useHighlightsStore.getState().setLoading(true);
    const rawHighlights = await adapter.getLocal(`highlights:${currentUrl}`);
    if (Array.isArray(rawHighlights)) {
      useHighlightsStore.getState().setHighlights(rawHighlights as Highlight[]);
    }
    useHighlightsStore.getState().setLoading(false);
  }

  const idbStorage = await createDestinationStorage();
  const destinations = await idbStorage.getAll();
  useSettingsStore.setState({ destinations });

  const handleSave = createSaveHandler(adapter, async (destinationId) => {
    const dest = await idbStorage.getById(destinationId);
    if (!dest) return false;
    return ensureWritable(dest.dirHandle);
  });

  bootstrapTheme().catch((err: unknown) => {
    logger.error('theme bootstrap failed', err);
  });

  createRoot(rootEl).render(
    createElement(StrictMode, null, createElement(SidePanel, { onSave: handleSave })),
  );
}

init().catch((err: unknown) => {
  logger.error('side-panel init failed', err);
});
