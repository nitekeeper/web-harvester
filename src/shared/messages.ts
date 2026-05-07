/** Type discriminant for the clip-page IPC message. */
export const MSG_CLIP = 'clip' as const;

/**
 * Message sent from the popup or side-panel to the background service worker
 * to request a clip of the current page into the named destination.
 */
export interface ClipPageMessage {
  readonly type: typeof MSG_CLIP;
  readonly destinationId: string;
}

/**
 * Response payload the background service worker returns after processing a
 * {@link ClipPageMessage}. On success `ok` is `true` and the saved file name
 * and destination label are included. On failure `ok` is `false` and `error`
 * contains a human-readable description.
 */
export type ClipPageResponse =
  | { readonly ok: true; readonly fileName: string; readonly destination: string }
  | { readonly ok: false; readonly error: string };

/**
 * Type guard for {@link ClipPageMessage}. Returns `true` only when `msg`
 * is a non-null object with `type === 'clip'` and a string `destinationId`.
 */
export function isClipPageMessage(msg: unknown): msg is ClipPageMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_CLIP &&
    typeof (msg as Record<string, unknown>)['destinationId'] === 'string'
  );
}

/** Type discriminant for the toggle-reader IPC message. */
export const MSG_TOGGLE_READER = 'toggle-reader' as const;

/**
 * Message sent from the popup or side-panel to the background service worker
 * to toggle reader mode on the currently active tab.
 */
export interface ToggleReaderMessage {
  readonly type: typeof MSG_TOGGLE_READER;
}

/**
 * Type guard for {@link ToggleReaderMessage}.
 */
export function isToggleReaderMessage(msg: unknown): msg is ToggleReaderMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_TOGGLE_READER
  );
}
