// src/presentation/settings/settings.ts
//
// Settings SPA composition root. Wires the chrome.storage adapter to the
// singleton settings store via `bootstrapStore`, opens the IDB-backed
// destination storage, pushes its current contents into the store, and then
// mounts the React tree wrapped in a `DestinationStorageProvider` so the
// settings sections can pick up the storage facade via context. Uses
// `createElement` (not JSX) so the file keeps its `.ts` extension referenced
// verbatim in `manifest.chrome.json`. See ADR-022.

import 'reflect-metadata';

import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import type { IStorageAdapter } from '@infrastructure/adapters/interfaces/IStorageAdapter';
import { createDestinationStorage } from '@infrastructure/storage/destinations';
import { getRootElement } from '@presentation/lib/mountApp';
import type { IDestinationPort } from '@presentation/ports/IDestinationPort';
import '@presentation/styles/global.css';
import { bootstrapStore } from '@presentation/stores/bootstrapStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';
import { createLogger } from '@shared/logger';
import { isPluginStatusPayload, PLUGIN_STATUS_STORAGE_KEY } from '@shared/pluginStatus';

import { DestinationStorageProvider } from './DestinationStorageContext';
import { Settings } from './Settings';

const logger = createLogger('settings');

/**
 * Reads plugin status from storage on startup and subscribes to live
 * storage-change events so the Plugins settings panel stays in sync with
 * the background service worker.
 */
function hydratePluginStatus(adapter: IStorageAdapter): void {
  adapter
    .getLocal(PLUGIN_STATUS_STORAGE_KEY)
    .then((raw) => {
      if (isPluginStatusPayload(raw)) {
        useSettingsStore.setState({ plugins: [...raw.plugins] });
      }
    })
    .catch((err: unknown) => {
      logger.error('failed to read plugin status', err);
    });

  adapter.onChanged((changes) => {
    if (!Object.prototype.hasOwnProperty.call(changes, PLUGIN_STATUS_STORAGE_KEY)) return;
    const change = Reflect.get(changes, PLUGIN_STATUS_STORAGE_KEY) as
      | { newValue?: unknown }
      | undefined;
    const newValue = change?.newValue;
    if (isPluginStatusPayload(newValue)) {
      useSettingsStore.setState({ plugins: [...newValue.plugins] });
    } else {
      logger.warn('plugin status changed to invalid value, clearing plugin list');
      useSettingsStore.setState({ plugins: [] });
    }
  });
}

async function init(): Promise<void> {
  const rootEl = getRootElement();
  const adapter = new ChromeAdapter();
  await bootstrapStore(adapter, 'settings-state', useSettingsStore, {
    serialize: (s) => ({ settings: s.settings, templates: s.templates }),
  });

  const idbStorage = await createDestinationStorage();
  // Structural typing: `Destination` matches `DestinationView` field-for-field.
  const port: IDestinationPort = idbStorage;
  const destinations = await idbStorage.getAll();
  useSettingsStore.setState({ destinations });
  hydratePluginStatus(adapter);

  bootstrapTheme().catch((err: unknown) => {
    logger.error('theme bootstrap failed', err);
  });
  createRoot(rootEl).render(
    createElement(
      StrictMode,
      null,
      createElement(DestinationStorageProvider, {
        storage: port,
        children: createElement(Settings),
      }),
    ),
  );
}

init().catch((err: unknown) => {
  logger.error('settings init failed', err);
});
