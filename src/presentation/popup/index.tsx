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
import { ensureWritable } from '@infrastructure/fsa/fsa';
import { createDestinationStorage } from '@infrastructure/storage/destinations';
import { createSaveHandler } from '@presentation/hooks/useSaveHandler';
import '@presentation/styles/global.css';
import { bootstrapStore } from '@presentation/stores/bootstrapStore';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useReaderStore } from '@presentation/stores/useReaderStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { bootstrapTheme } from '@presentation/theme/bootstrapTheme';
import { createLogger } from '@shared/logger';
import {
  MSG_START_HIGHLIGHT,
  MSG_START_PICKER,
  MSG_STOP_HIGHLIGHT,
  MSG_STOP_PICKER,
  MSG_TOGGLE_READER,
} from '@shared/messages';

import { Popup } from './Popup';
import { triggerPreview } from './triggerPreview';

const logger = createLogger('popup');

/** Builds the reader-toggle handler wired to the given adapter. */
function makeReaderToggleHandler(adapter: ChromeAdapter): () => void {
  return (): void => {
    const current = usePopupStore.getState().isReaderActive;
    usePopupStore.getState().setReaderActive(!current);
    const settings = useReaderStore.getState().settings;
    adapter
      .sendMessage({ type: MSG_TOGGLE_READER, settings, activate: !current })
      .catch((err: unknown) => {
        logger.error('toggle-reader message failed', err);
      });
  };
}

/** Builds the highlight-toggle handler wired to the given adapter. */
function makeHighlightToggleHandler(adapter: ChromeAdapter): () => void {
  return (): void => {
    const current = usePopupStore.getState().isHighlightActive;
    usePopupStore.getState().setHighlightActive(!current);
    const type = current ? MSG_STOP_HIGHLIGHT : MSG_START_HIGHLIGHT;
    adapter.sendMessage({ type }).catch((err: unknown) => {
      logger.error('highlight toggle message failed', err);
    });
  };
}

/** Builds the picker-toggle handler wired to the given adapter. */
function makePickerToggleHandler(adapter: ChromeAdapter): () => void {
  return (): void => {
    const current = usePopupStore.getState().isPickerActive;
    usePopupStore.getState().setPickerActive(!current);
    const msg = current
      ? { type: MSG_STOP_PICKER }
      : { type: MSG_START_PICKER, mode: 'exclude' as const };
    adapter.sendMessage(msg).catch((err: unknown) => {
      logger.error('picker toggle message failed', err);
    });
  };
}

/** Mounts the React tree into `rootEl` and fires the initial preview. */
function mountPopup(rootEl: HTMLElement, adapter: ChromeAdapter, onSave: () => void): void {
  bootstrapTheme().catch((err: unknown) => {
    logger.error('theme bootstrap failed', err);
  });
  createRoot(rootEl).render(
    <StrictMode>
      <Popup
        onSave={onSave}
        onSettings={() => {
          adapter.openOptionsPage();
        }}
        onReaderToggle={makeReaderToggleHandler(adapter)}
        onHighlightToggle={makeHighlightToggleHandler(adapter)}
        onPickerToggle={makePickerToggleHandler(adapter)}
        onTemplateChange={() => {
          triggerPreview(adapter, logger).catch((err: unknown) => {
            logger.error('template-change preview failed', err);
          });
        }}
      />
    </StrictMode>,
  );
  triggerPreview(adapter, logger).catch((err: unknown) => {
    logger.error('initial preview failed', err);
  });
}

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

  const { selectedTemplateId } = usePopupStore.getState();
  if (selectedTemplateId === null) {
    const { settings } = useSettingsStore.getState();
    if (settings.defaultTemplateId) {
      usePopupStore.setState({ selectedTemplateId: settings.defaultTemplateId });
    }
  }

  const idbStorage = await createDestinationStorage();
  const destinations = await idbStorage.getAll();
  useSettingsStore.setState({ destinations });

  const handleSave = createSaveHandler(adapter, async (destinationId) => {
    const dest = await idbStorage.getById(destinationId);
    if (!dest) return false;
    return ensureWritable(dest.dirHandle);
  });

  mountPopup(rootEl, adapter, handleSave);
}

init().catch((err: unknown) => {
  logger.error('popup init failed', err);
});
