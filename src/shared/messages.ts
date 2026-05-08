import type { ReaderSettings } from './reader-settings';

/** Type discriminant for the preview-page IPC message. */
export const MSG_PREVIEW = 'preview' as const;

/**
 * Message sent from the popup to the background service worker to request a
 * live preview of the current page compiled against the active template.
 */
export interface PreviewPageMessage {
  readonly type: typeof MSG_PREVIEW;
  /** ID of the template to compile the preview with. Null means no template. */
  readonly templateId: string | null;
}

/**
 * Response payload the background returns after processing a
 * {@link PreviewPageMessage}. On success contains the compiled markdown string.
 */
export type PreviewPageResponse =
  | { readonly ok: true; readonly previewMarkdown: string }
  | { readonly ok: false; readonly error: string };

/**
 * Type guard for {@link PreviewPageMessage}.
 */
export function isPreviewPageMessage(msg: unknown): msg is PreviewPageMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_PREVIEW &&
    ((msg as Record<string, unknown>)['templateId'] === null ||
      typeof (msg as Record<string, unknown>)['templateId'] === 'string')
  );
}

/** Type discriminant for the clip-page IPC message. */
export const MSG_CLIP = 'clip' as const;

/**
 * Message sent from the popup or side-panel to the background service worker
 * to request a clip of the current page into the named destination.
 */
export interface ClipPageMessage {
  readonly type: typeof MSG_CLIP;
  readonly destinationId: string;
  /** Pre-compiled markdown from the live preview. When present the background
   *  skips re-extraction and uses this content directly. */
  readonly previewMarkdown?: string;
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
 * to toggle reader mode on the currently active tab. Carries the current
 * reader settings so the content script can apply them immediately.
 */
export interface ToggleReaderMessage {
  readonly type: typeof MSG_TOGGLE_READER;
  readonly settings: ReaderSettings;
}

/**
 * Type guard for {@link ToggleReaderMessage}.
 */
export function isToggleReaderMessage(msg: unknown): msg is ToggleReaderMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_TOGGLE_READER &&
    typeof (msg as Record<string, unknown>)['settings'] === 'object' &&
    (msg as Record<string, unknown>)['settings'] !== null
  );
}

/** Type discriminant for the start-highlight IPC message. */
export const MSG_START_HIGHLIGHT = 'start-highlight' as const;

/** Message sent from the popup to start highlight mode on the active tab. */
export interface StartHighlightMessage {
  readonly type: typeof MSG_START_HIGHLIGHT;
}

/** Type guard for {@link StartHighlightMessage}. */
export function isStartHighlightMessage(msg: unknown): msg is StartHighlightMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_START_HIGHLIGHT
  );
}

/** Type discriminant for the stop-highlight IPC message. */
export const MSG_STOP_HIGHLIGHT = 'stop-highlight' as const;

/** Message sent from the popup to stop highlight mode on the active tab. */
export interface StopHighlightMessage {
  readonly type: typeof MSG_STOP_HIGHLIGHT;
}

/** Type guard for {@link StopHighlightMessage}. */
export function isStopHighlightMessage(msg: unknown): msg is StopHighlightMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_STOP_HIGHLIGHT
  );
}

/** Type discriminant for the highlight-mode-exited notification from the content script. */
export const MSG_HIGHLIGHT_MODE_EXITED = 'highlight-mode-exited' as const;

/** Message sent from the content script when the user exits highlight mode via the floating menu. */
export interface HighlightModeExitedMessage {
  readonly type: typeof MSG_HIGHLIGHT_MODE_EXITED;
}

/** Type guard for {@link HighlightModeExitedMessage}. */
export function isHighlightModeExitedMessage(msg: unknown): msg is HighlightModeExitedMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_HIGHLIGHT_MODE_EXITED
  );
}
