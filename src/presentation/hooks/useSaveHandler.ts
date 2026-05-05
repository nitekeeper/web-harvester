// src/presentation/hooks/useSaveHandler.ts
//
// Factory that creates the `onSave` callback wired into the popup and
// side-panel composition roots. Reads store state inside the callback to
// avoid stale closures; all async errors are caught internally so the
// returned function is always safe to call fire-and-forget.

import { usePopupStore } from '@presentation/stores/usePopupStore';
import { createLogger } from '@shared/logger';
import { MSG_CLIP, type ClipPageResponse } from '@shared/messages';

const logger = createLogger('use-save-handler');

/**
 * Minimal port for sending a one-way IPC message to the background service
 * worker. `ChromeAdapter` satisfies this structurally so no `@infrastructure`
 * import is needed here.
 */
export interface ISendMessagePort {
  /** Sends `msg` to the background and resolves with its response. */
  sendMessage(msg: unknown): Promise<unknown>;
}

/**
 * Returns an `onSave` callback that sends a {@link ClipPageMessage} to the
 * background service worker and updates the popup store with the result.
 * Intended to be called once from a composition root and passed as a prop.
 */
export function createSaveHandler(adapter: ISendMessagePort): () => void {
  return (): void => {
    const store = usePopupStore.getState();
    const { selectedDestinationId } = store;
    if (!selectedDestinationId) {
      logger.warn('createSaveHandler called with no destination selected');
      return;
    }
    store.setSaving(true);
    store.setSaveStatus('saving');
    adapter
      .sendMessage({ type: MSG_CLIP, destinationId: selectedDestinationId })
      .then((raw) => {
        const response = raw as ClipPageResponse;
        if (response.ok) {
          usePopupStore.getState().setSaveStatus('success', response.destination);
        } else {
          usePopupStore.getState().setSaveStatus('error');
          logger.error('clip request failed', response.error);
        }
      })
      .catch((err: unknown) => {
        usePopupStore.getState().setSaveStatus('error');
        logger.error('sendMessage rejected', err);
      })
      .finally(() => {
        usePopupStore.getState().setSaving(false);
      });
  };
}
