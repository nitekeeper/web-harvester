// src/presentation/side-panel/side-panel.ts
//
// Side-panel SPA composition root. Mirrors the popup wiring — bootstraps
// both singleton stores from chrome.storage before mounting the React tree.
// See ADR-022 for the cross-layer ESLint carve-out covering this file.

import 'reflect-metadata';

import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { isHighlight } from '@application/HighlightService';
import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import { ensureWritable } from '@infrastructure/fsa/fsa';
import { createDestinationStorage } from '@infrastructure/storage/destinations';
import { createSaveHandler } from '@presentation/hooks/useSaveHandler';
import { getRootElement } from '@presentation/lib/mountApp';
import '@presentation/styles/global.css';
import { bootstrapStore } from '@presentation/stores/bootstrapStore';
import { useHighlightsStore } from '@presentation/stores/useHighlightsStore';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useReaderStore } from '@presentation/stores/useReaderStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';
import { createLogger } from '@shared/logger';
import { MSG_TOGGLE_READER } from '@shared/messages';

import { SidePanel } from './SidePanel';

const logger = createLogger('side-panel');

/** Bootstraps all singleton stores from `chrome.storage`. */
async function bootstrapAllStores(adapter: ChromeAdapter): Promise<void> {
  await Promise.all([
    bootstrapStore(adapter, 'settings-state', useSettingsStore, {
      serialize: (s) => ({ settings: s.settings, templates: s.templates }),
    }),
    bootstrapStore(adapter, 'popup-state', usePopupStore),
    bootstrapStore(adapter, 'reader-settings', useReaderStore),
  ]);
}

/** Loads highlights for the active tab into the highlights store. */
async function loadHighlights(adapter: ChromeAdapter): Promise<void> {
  const currentUrl = usePopupStore.getState().activeTab?.url;
  if (!currentUrl) return;
  useHighlightsStore.getState().setLoading(true);
  const rawHighlights = await adapter.getLocal(`highlights:${currentUrl}`);
  if (Array.isArray(rawHighlights)) {
    useHighlightsStore.getState().setHighlights(rawHighlights.filter(isHighlight));
  }
  useHighlightsStore.getState().setLoading(false);
}

const HIGHLIGHTS_PREFIX = 'highlights:';

/**
 * Subscribes to storage changes and popup URL changes so that highlights
 * are reloaded whenever the active tab switches or storage is updated
 * externally (e.g. the user adds a highlight while the panel is open).
 */
function subscribeHighlightReloads(adapter: ChromeAdapter): void {
  adapter.onChanged((changes) => {
    const currentUrl = usePopupStore.getState().activeTab?.url;
    if (!currentUrl) return;
    if (Object.prototype.hasOwnProperty.call(changes, `${HIGHLIGHTS_PREFIX}${currentUrl}`)) {
      loadHighlights(adapter).catch((err: unknown) => {
        logger.error('highlights reload on storage change failed', err);
      });
    }
  });

  usePopupStore.subscribe((state, prevState) => {
    const url = state.activeTab?.url;
    const prevUrl = prevState.activeTab?.url;
    if (url !== undefined && url !== prevUrl) {
      loadHighlights(adapter).catch((err: unknown) => {
        logger.error('highlights reload on url change failed', err);
      });
    }
  });
}

async function init(): Promise<void> {
  const rootEl = getRootElement();
  const adapter = new ChromeAdapter();
  await bootstrapAllStores(adapter);
  await loadHighlights(adapter);
  subscribeHighlightReloads(adapter);

  const idbStorage = await createDestinationStorage();
  const destinations = await idbStorage.getAll();
  useSettingsStore.setState({ destinations });

  const handleSave = createSaveHandler(adapter, async (destinationId) => {
    const dest = await idbStorage.getById(destinationId);
    if (!dest) return false;
    return ensureWritable(dest.dirHandle);
  });

  const handleReaderToggle = (): void => {
    const current = usePopupStore.getState().isReaderActive;
    usePopupStore.getState().setReaderActive(!current);
    const settings = useReaderStore.getState().settings;
    adapter
      .sendMessage({ type: MSG_TOGGLE_READER, settings, activate: !current })
      .catch((err: unknown) => {
        logger.error('toggle-reader message failed', err);
      });
  };

  bootstrapTheme().catch((err: unknown) => {
    logger.error('theme bootstrap failed', err);
  });

  createRoot(rootEl).render(
    createElement(
      StrictMode,
      null,
      createElement(SidePanel, { onSave: handleSave, onReaderToggle: handleReaderToggle }),
    ),
  );
}

init().catch((err: unknown) => {
  logger.error('side-panel init failed', err);
});
