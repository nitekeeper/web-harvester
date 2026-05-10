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
 *
 * The `activate` flag encodes the desired direction explicitly so the
 * background never needs to track state — MV3 service workers restart on
 * idle and would otherwise lose the in-memory toggle state.
 */
export interface ToggleReaderMessage {
  readonly type: typeof MSG_TOGGLE_READER;
  readonly settings: ReaderSettings;
  /** `true` to activate reader mode, `false` to deactivate. */
  readonly activate: boolean;
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
    (msg as Record<string, unknown>)['settings'] !== null &&
    typeof (msg as Record<string, unknown>)['activate'] === 'boolean'
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

/** Type discriminant for the start-picker IPC message. */
export const MSG_START_PICKER = 'start-picker' as const;

/** Type discriminant for the stop-picker IPC message. */
export const MSG_STOP_PICKER = 'stop-picker' as const;

/**
 * Message sent from the popup to the background to activate the section
 * picker on the active tab. Always uses exclude mode from the popup.
 */
export interface StartPickerMessage {
  readonly type: typeof MSG_START_PICKER;
  readonly mode: 'exclude' | 'include';
}

/**
 * Message sent from the popup to the background to deactivate the section
 * picker on the active tab.
 */
export interface StopPickerMessage {
  readonly type: typeof MSG_STOP_PICKER;
}

/** Type guard for {@link StartPickerMessage}. */
export function isStartPickerMessage(msg: unknown): msg is StartPickerMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_START_PICKER &&
    ((msg as Record<string, unknown>)['mode'] === 'exclude' ||
      (msg as Record<string, unknown>)['mode'] === 'include')
  );
}

/** Type guard for {@link StopPickerMessage}. */
export function isStopPickerMessage(msg: unknown): msg is StopPickerMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_STOP_PICKER
  );
}

/** Type discriminant for the picker-result notification sent from the content script. */
export const MSG_PICKER_RESULT = 'picker-result' as const;

/**
 * Message sent from the content script to the background when the user
 * finishes a picker session. `result` is present on confirm, absent on cancel.
 * Using a short fire-and-forget message avoids keeping the MV3 service-worker
 * message channel open for the full duration of picker interaction.
 */
export interface PickerResultMessage {
  readonly type: typeof MSG_PICKER_RESULT;
  /** XPath lists selected by the user. Absent when the session was cancelled. */
  readonly result?: {
    readonly excludedXPaths?: readonly string[];
    readonly includedXPaths?: readonly string[];
  };
}

/** Type guard for {@link PickerResultMessage}. */
export function isPickerResultMessage(msg: unknown): msg is PickerResultMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_PICKER_RESULT
  );
}

/** Type discriminant for the extractSelectors message sent to the content script. */
export const MSG_EXTRACT_SELECTORS = 'extractSelectors' as const;

/**
 * Message sent from `TemplatePlugin` (background) to the content script to
 * resolve CSS selector expressions against the live DOM. The response is a
 * `Record<string, string>` mapping each expression to its extracted value.
 */
export interface ExtractSelectorsMessage {
  readonly type: typeof MSG_EXTRACT_SELECTORS;
  /** Selector expressions without braces, e.g. `['selector:.byline']`. */
  readonly selectors: readonly string[];
}

/** Type guard for {@link ExtractSelectorsMessage}. */
export function isExtractSelectorsMessage(msg: unknown): msg is ExtractSelectorsMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_EXTRACT_SELECTORS &&
    Array.isArray((msg as Record<string, unknown>)['selectors'])
  );
}

/** Type discriminant for the start-css-picker message. */
export const MSG_START_CSS_PICKER = 'START_CSS_PICKER' as const;

/** Message sent from the settings page to activate the CSS selector picker on the active tab. */
export interface StartCssPickerMessage {
  readonly type: typeof MSG_START_CSS_PICKER;
}

/** Type guard for {@link StartCssPickerMessage}. */
export function isStartCssPickerMessage(msg: unknown): msg is StartCssPickerMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_START_CSS_PICKER
  );
}

/** Type discriminant for the stop-css-picker message. */
export const MSG_STOP_CSS_PICKER = 'STOP_CSS_PICKER' as const;

/** Message sent from the settings page to deactivate the CSS selector picker. */
export interface StopCssPickerMessage {
  readonly type: typeof MSG_STOP_CSS_PICKER;
}

/** Type guard for {@link StopCssPickerMessage}. */
export function isStopCssPickerMessage(msg: unknown): msg is StopCssPickerMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_STOP_CSS_PICKER
  );
}

/** Type discriminant for the css-picker-result notification from the content script. */
export const MSG_CSS_PICKER_RESULT = 'css-picker-result' as const;

/** Message sent from the content script when the user clicks an element during CSS picking. */
export interface CssPickerResultMessage {
  readonly type: typeof MSG_CSS_PICKER_RESULT;
  readonly selector: string;
}

/** Type guard for {@link CssPickerResultMessage}. */
export function isCssPickerResultMessage(msg: unknown): msg is CssPickerResultMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['type'] === MSG_CSS_PICKER_RESULT &&
    typeof (msg as Record<string, unknown>)['selector'] === 'string'
  );
}

/** Storage key written by the background when a CSS picker session completes. */
export const CSS_PICKER_RESULT_KEY = 'cssPickerResult';
