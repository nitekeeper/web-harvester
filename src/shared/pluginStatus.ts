/**
 * Shared plugin status types, storage key, and runtime type guard.
 * Written to `chrome.storage.local` by the background service worker;
 * read by the settings page to render the Plugins panel.
 *
 * No imports — this file has zero dependencies.
 */

/** The three lifecycle states a registered plugin can be in. */
export type PluginState = 'active' | 'inactive' | 'failed';

/** Serialisable status record for one plugin, as shown on the Plugins settings page. */
export interface PluginRow {
  /** Stable registry id, e.g. `wh.dest.notion`. */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
  /** Semver-ish string without leading `v`, e.g. `0.4.2`. Omit when unavailable. */
  readonly version?: string;
  /** Current lifecycle state. */
  readonly state: PluginState;
  /** Error message string — populated only when `state === 'failed'`. */
  readonly error?: string;
}

/** Shape written to `chrome.storage.local` by the background service worker. */
export interface PluginStatusPayload {
  /** All registered plugins with their current state. */
  readonly plugins: readonly PluginRow[];
}

/** Storage key used by both the background (writer) and settings page (reader). */
export const PLUGIN_STATUS_STORAGE_KEY = 'wh_plugin_status' as const;

const VALID_STATES: ReadonlySet<string> = new Set<string>(['active', 'inactive', 'failed']);

/**
 * Returns `true` when `val` conforms to {@link PluginRow}.
 * Uses bracket notation with string literals to satisfy `security/detect-object-injection`.
 */
function isPluginRow(val: unknown): val is PluginRow {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['state'] === 'string' &&
    VALID_STATES.has(obj['state'])
  );
}

/**
 * Type guard for {@link PluginStatusPayload}.
 * Safe to call on any `unknown` value retrieved from `chrome.storage.local`.
 */
export function isPluginStatusPayload(val: unknown): val is PluginStatusPayload {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  if (!Array.isArray(obj['plugins'])) return false;
  return (obj['plugins'] as unknown[]).every(isPluginRow);
}
