// src/presentation/popup/triggerPreview.ts
//
// Extracted helper so that both index.tsx and tests can share the exact same
// `triggerPreview` logic without duplicating it.

import { usePopupStore } from '@presentation/stores/usePopupStore';
import type { Logger } from '@shared/logger';
import { MSG_PREVIEW, type PreviewPageResponse } from '@shared/messages';

/**
 * Minimal interface describing only the capability `triggerPreview` needs from
 * the browser adapter. Defined here to avoid a cross-layer import of
 * `IRuntimeAdapter` from `infrastructure` into `presentation`.
 */
export interface IMessageSender {
  sendMessage(msg: unknown): Promise<unknown>;
}

/**
 * Sends a {@link MSG_PREVIEW} message to the background service worker via
 * the supplied adapter and updates the popup store with the compiled markdown
 * on success. Clears any stale `previewMarkdown` first so the UI shows the
 * loading state immediately.
 *
 * @param adapter - Message-sending adapter used to dispatch the preview request.
 * @param logger  - Scoped logger for warning on preview failure.
 */
export async function triggerPreview(adapter: IMessageSender, logger: Logger): Promise<void> {
  const { selectedTemplateId, setIsPreviewing, setPreviewMarkdown } = usePopupStore.getState();
  setPreviewMarkdown('');
  setIsPreviewing(true);
  try {
    const response = (await adapter.sendMessage({
      type: MSG_PREVIEW,
      templateId: selectedTemplateId,
    })) as PreviewPageResponse;
    if (response.ok) {
      setPreviewMarkdown(response.previewMarkdown);
    } else {
      logger.warn('preview returned error from background', response.error);
    }
  } catch (err: unknown) {
    logger.warn('preview failed', err);
  } finally {
    setIsPreviewing(false);
  }
}
