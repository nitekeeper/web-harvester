// src/application/HighlightService.ts

import type { ILogger } from '@domain/types';
import { createLogger } from '@shared/logger';

// ── Domain types ──────────────────────────────────────────────────────────────

/**
 * A single text highlight on a web page. `id` is service-generated; `xpath`
 * locates the highlighted node within the DOM so it can be re-applied on
 * subsequent visits; `color` matches one of the user-configured palette
 * entries (defaults to `'yellow'`).
 */
export interface Highlight {
  readonly id: string;
  readonly url: string;
  readonly text: string;
  readonly color: string;
  readonly xpath: string;
  readonly createdAt: number;
}

/**
 * Type guard that returns `true` when `obj` is a non-null object with all
 * required {@link Highlight} string fields (`id`, `url`, `text`, `color`,
 * `xpath`) and a numeric `createdAt`. Use this before casting raw storage data
 * to `Highlight` to avoid propagating malformed records.
 */
export function isHighlight(obj: unknown): obj is Highlight {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['url'] === 'string' &&
    typeof record['text'] === 'string' &&
    typeof record['color'] === 'string' &&
    typeof record['xpath'] === 'string' &&
    typeof record['createdAt'] === 'number'
  );
}

// ── Port interfaces (subset used by this service) ────────────────────────────

/**
 * Minimal storage port required by `HighlightService`. Mirrors the relevant
 * slice of `IStorageAdapter` from the infrastructure layer; defined locally so
 * this service stays within the application layer's allowed import surface.
 */
export interface IStorageAdapterPort {
  getLocal(key: string): Promise<unknown>;
  setLocal(key: string, value: unknown): Promise<void>;
  removeLocal(key: string): Promise<void>;
}

/**
 * Local hook port describing the single hook this service emits. Defined here
 * because `application/` cannot import from `@core/hooks` and the placeholder
 * `IHookSystem` in `@domain/types` exposes hooks only as `unknown`.
 */
export interface IHighlightHooksPort {
  readonly onHighlight: {
    tap(name: string, fn: (h: Highlight) => void): void;
    call(h: Highlight): Promise<void>;
  };
}

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Public surface of the highlight service. Provides per-URL CRUD over
 * persisted highlights and emits the `onHighlight` hook on each successful
 * `addHighlight()`.
 */
export interface IHighlightService {
  /** Creates and persists a highlight for `url`, fires `onHighlight`, and returns it. */
  addHighlight(url: string, text: string, xpath: string, color?: string): Promise<Highlight>;
  /** Returns all persisted highlights for the given URL (empty array when none). */
  getHighlightsForUrl(url: string): Promise<Highlight[]>;
  /** Removes a single highlight by id, scanning the URL index to locate its owner. */
  removeHighlight(id: string): Promise<void>;
  /** Removes the entire per-URL highlight bucket from storage. */
  clearHighlightsForUrl(url: string): Promise<void>;
}

// ── Implementation ────────────────────────────────────────────────────────────

const HIGHLIGHT_INDEX_KEY = 'highlight_index';

/** Returns the storage key under which highlights for a URL are persisted. */
function storageKey(url: string): string {
  return `highlights:${url}`;
}

/**
 * Generates a short, time-stamped, lexicographically increasing highlight id.
 * Uses `Math.random()` purely as a uniqueness disambiguator within a
 * millisecond — id values are not used as security tokens, so a non-CSPRNG
 * source is acceptable here.
 */
function generateId(): string {
  // eslint-disable-next-line sonarjs/pseudo-random -- non-security id disambiguator
  const random = Math.random().toString(36).slice(2, 9);
  return `hl_${Date.now()}_${random}`;
}

/**
 * Application service that manages per-URL highlight CRUD and hook emission.
 * Highlights are stored as `Highlight[]` under `highlights:{url}` keys; a
 * companion `highlight_index` array tracks which URLs have buckets so
 * `removeHighlight()` can locate an id without scanning all storage keys.
 */
export class HighlightService implements IHighlightService {
  /**
   * @param storage - Storage port used to persist per-URL highlight buckets.
   * @param hooks - Hook port exposing `onHighlight` for plugin notifications.
   * @param logger - Scoped logger; defaults to a `HighlightService`-scoped logger.
   */
  constructor(
    private readonly storage: IStorageAdapterPort,
    private readonly hooks: Pick<IHighlightHooksPort, 'onHighlight'>,
    private readonly logger: ILogger = createLogger('HighlightService'),
  ) {}

  /**
   * Creates a new `Highlight`, appends it to the URL's bucket, persists the
   * updated bucket, then fires the `onHighlight` hook so plugins can react.
   * Returns the freshly-created highlight (with generated `id` and
   * `createdAt`).
   */
  async addHighlight(
    url: string,
    text: string,
    xpath: string,
    color = 'yellow',
  ): Promise<Highlight> {
    const existing = await this.getHighlightsForUrl(url);
    const highlight: Highlight = {
      id: generateId(),
      url,
      text,
      color,
      xpath,
      createdAt: Date.now(),
    };
    await this.storage.setLocal(storageKey(url), [...existing, highlight]);
    await this.updateIndex(url);
    this.logger.debug('Highlight added', { id: highlight.id, url });
    await this.hooks.onHighlight.call(highlight);
    return highlight;
  }

  /**
   * Reads the persisted bucket for `url`. Returns an empty array on a missing
   * or non-array record so callers always receive a usable list.
   */
  async getHighlightsForUrl(url: string): Promise<Highlight[]> {
    const raw = await this.storage.getLocal(storageKey(url));
    if (!Array.isArray(raw)) return [];
    return raw as Highlight[];
  }

  /**
   * Removes a highlight by id by walking the `highlight_index` URL list. The
   * index avoids a full storage scan; if the id is not found in any indexed
   * URL the call logs a warning and resolves without persisting.
   */
  async removeHighlight(id: string): Promise<void> {
    const indexRaw = await this.storage.getLocal(HIGHLIGHT_INDEX_KEY);
    const urls: string[] = Array.isArray(indexRaw) ? (indexRaw as string[]) : [];
    for (const url of urls) {
      const highlights = await this.getHighlightsForUrl(url);
      const idx = highlights.findIndex((h) => h.id === id);
      if (idx !== -1) {
        const updated = highlights.filter((h) => h.id !== id);
        await this.storage.setLocal(storageKey(url), updated);
        this.logger.debug('Highlight removed', { id, url });
        return;
      }
    }
    this.logger.warn('removeHighlight: id not found', { id });
  }

  /** Removes the entire `highlights:{url}` bucket from storage. */
  async clearHighlightsForUrl(url: string): Promise<void> {
    await this.storage.removeLocal(storageKey(url));
    this.logger.info('Highlights cleared for URL', { url });
  }

  /**
   * Ensures `url` is present in the `highlight_index` array so
   * `removeHighlight()` can find which bucket owns a given id without
   * scanning all storage keys.
   */
  private async updateIndex(url: string): Promise<void> {
    const indexRaw = await this.storage.getLocal(HIGHLIGHT_INDEX_KEY);
    const urls: string[] = Array.isArray(indexRaw) ? (indexRaw as string[]) : [];
    if (!urls.includes(url)) {
      await this.storage.setLocal(HIGHLIGHT_INDEX_KEY, [...urls, url]);
    }
  }
}
