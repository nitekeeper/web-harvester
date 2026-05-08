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
 *
 * @param adapter - Port used to send the IPC message to the background.
 * @param preFlight - Optional async check run before the clip message is sent
 *   (e.g. FSA permission request in a user-gesture context). Returning `false`
 *   or rejecting cancels the clip and sets saveStatus to `'error'`.
 */
/** Handles the clip response and updates the store accordingly. */
function handleClipResponse(raw: unknown): void {
  const response = raw as ClipPageResponse;
  if (response.ok) {
    usePopupStore.getState().setSaveStatus('success', response.destination);
  } else {
    usePopupStore.getState().setSaveStatus('error');
    logger.error('clip request failed', response.error);
  }
}

/**
 * Returns an `onSave` callback that sends a {@link ClipPageMessage} to the
 * background service worker and updates the popup store with the result.
 * Intended to be called once from a composition root and passed as a prop.
 *
 * @param adapter - Port used to send the IPC message to the background.
 * @param preFlight - Optional async check run before the clip message is sent
 *   (e.g. FSA permission request in a user-gesture context). Returning `false`
 *   or rejecting cancels the clip and sets saveStatus to `'error'`.
 */
export function createSaveHandler(
  adapter: ISendMessagePort,
  preFlight?: (destinationId: string) => Promise<boolean>,
): () => void {
  return (): void => {
    const store = usePopupStore.getState();
    const { selectedDestinationId } = store;
    if (!selectedDestinationId) {
      logger.warn('createSaveHandler called with no destination selected');
      return;
    }
    store.setSaving(true);
    store.setSaveStatus('saving');
    const preFlightPromise = preFlight ? preFlight(selectedDestinationId) : Promise.resolve(true);
    preFlightPromise
      .then((granted) => {
        if (!granted) throw new Error('FSA permission denied');
        return adapter.sendMessage({
          type: MSG_CLIP,
          destinationId: selectedDestinationId,
          previewMarkdown: usePopupStore.getState().previewMarkdown || undefined,
        });
      })
      .then(handleClipResponse)
      .catch((err: unknown) => {
        usePopupStore.getState().setSaveStatus('error');
        logger.error('sendMessage rejected', err);
      })
      .finally(() => {
        usePopupStore.getState().setSaving(false);
      });
  };
}
