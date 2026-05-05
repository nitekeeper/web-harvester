// src/presentation/popup/index.tsx
//
// Popup SPA composition root. Wires the chrome.storage adapter to both
// singleton stores via `bootstrapStore`, then mounts the React tree. The
// `serialize` option on the settings bootstrap excludes `destinations` (FSA
// handles cannot round-trip through chrome.storage) and `isLoading` (UI
// transient) — see ADR-022. Storage hydration must complete before the React
// tree renders so the first paint has the persisted values, not the
// zeroed-out singleton defaults.

import 'reflect-metadata';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import { createDestinationStorage } from '@infrastructure/storage/destinations';
import { createSaveHandler } from '@presentation/hooks/useSaveHandler';
import '@presentation/styles/global.css';
import { bootstrapStore } from '@presentation/stores/bootstrapStore';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';
import { createLogger } from '@shared/logger';

import { Popup } from './Popup';

const logger = createLogger('popup');

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

  const idbStorage = await createDestinationStorage();
  const destinations = await idbStorage.getAll();
  useSettingsStore.setState({ destinations });

  const handleSave = createSaveHandler(adapter);

  bootstrapTheme().catch((err: unknown) => {
    logger.error('theme bootstrap failed', err);
  });
  createRoot(rootEl).render(
    <StrictMode>
      <Popup
        onSave={handleSave}
        onSettings={() => {
          adapter.openOptionsPage();
        }}
      />
    </StrictMode>,
  );
}

init().catch((err: unknown) => {
  logger.error('popup init failed', err);
});
