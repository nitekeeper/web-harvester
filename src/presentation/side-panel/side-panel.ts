// src/presentation/side-panel/side-panel.ts
//
// Side-panel SPA composition root. Mirrors the popup wiring — bootstraps
// both singleton stores from chrome.storage before mounting the React tree.
// `mountApp` calls `bootstrapTheme` internally so we do not call it again
// here. See ADR-022 for the cross-layer ESLint carve-out covering this file.

import 'reflect-metadata';

import { ChromeAdapter } from '@infrastructure/adapters/chrome/ChromeAdapter';
import { mountApp } from '@presentation/lib/mountApp';
import '@presentation/styles/global.css';
import { bootstrapStore } from '@presentation/stores/bootstrapStore';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { createLogger } from '@shared/logger';

import { SidePanel } from './SidePanel';

const logger = createLogger('side-panel');

async function init(): Promise<void> {
  const adapter = new ChromeAdapter();
  await Promise.all([
    bootstrapStore(adapter, 'settings-state', useSettingsStore, {
      serialize: (s) => ({ settings: s.settings, templates: s.templates }),
    }),
    bootstrapStore(adapter, 'popup-state', usePopupStore),
  ]);
  mountApp(SidePanel);
}

init().catch((err: unknown) => {
  logger.error('side-panel init failed', err);
});
