// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Common shape shared by all highlight kinds. A highlight is a stable
 * reference to a region of a page, identified by xpath plus per-kind offset
 * data, with optional user notes and group membership.
 */
export interface HighlightData {
  readonly id: string;
  readonly xpath: string;
  readonly content: string;
  readonly notes?: string[];
  readonly groupId?: string;
}

/**
 * A highlight that spans a text range inside a single element, expressed as
 * character offsets relative to the element's text content.
 */
export interface TextHighlightData extends HighlightData {
  readonly type: 'text';
  readonly startOffset: number;
  readonly endOffset: number;
}

/**
 * A highlight that selects an entire block-level element (e.g. a figure,
 * image, or table) rather than a substring of its text.
 */
export interface ElementHighlightData extends HighlightData {
  readonly type: 'element';
}

/**
 * Discriminated union of all highlight kinds. Narrow on `type` to access
 * kind-specific fields.
 */
export type AnyHighlightData = TextHighlightData | ElementHighlightData;

/**
 * Persisted bundle of highlights for a single page URL, plus optional title
 * for display. This is the value stored under each URL key in browser
 * storage.
 */
export interface StoredData {
  readonly highlights: AnyHighlightData[];
  readonly url: string;
  readonly title?: string;
}

/**
 * Map keyed by normalized page URL containing the persisted highlight data
 * for that page.
 */
export type HighlightsStorage = Record<string, StoredData>;

/**
 * A single highlight serialized for export (clipping, JSON
 * download, etc.). Grouped highlights are coalesced into one entry.
 */
export interface ExportedHighlight {
  readonly text: string;
  readonly timestamp: string;
  readonly notes?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Block elements highlighted as a whole unit rather than as the text inside
 * them. Ported from src/utils/highlighter.ts.
 */
export const BLOCK_HIGHLIGHT_TAGS = new Set(['FIGURE', 'PICTURE', 'IMG', 'TABLE', 'PRE']);

/**
 * URL query parameters that are ephemeral (tracking, ad click IDs, etc.) and
 * should be stripped when normalizing page URLs for highlight storage.
 */
export const EPHEMERAL_PARAMS = new Set([
  't',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'src',
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'twclid',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gl',
  'si',
]);

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Normalizes a URL for use as a highlight storage key by stripping the
 * fragment and removing ephemeral tracking query parameters. Returns the
 * input unchanged if it cannot be parsed as a URL.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    const params = new URLSearchParams(parsed.search);
    for (const key of [...params.keys()]) {
      if (EPHEMERAL_PARAMS.has(key)) params.delete(key);
    }
    parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Groups highlights that share a `groupId` so they can be exported or
 * displayed as a single logical highlight. Ungrouped highlights pass through
 * as single-element arrays. Insertion order is preserved.
 */
export function groupHighlights(highlights: AnyHighlightData[]): AnyHighlightData[][] {
  const groups: AnyHighlightData[][] = [];
  const byGroupId = new Map<string, AnyHighlightData[]>();
  for (const h of highlights) {
    if (h.groupId) {
      const existing = byGroupId.get(h.groupId);
      if (existing) {
        existing.push(h);
        continue;
      }
      const arr: AnyHighlightData[] = [h];
      byGroupId.set(h.groupId, arr);
      groups.push(arr);
    } else {
      groups.push([h]);
    }
  }
  return groups;
}

/**
 * Collapses grouped highlights into a flat array of `ExportedHighlight`
 * objects. Group members are joined with blank lines; notes are merged.
 *
 * The optional `transformContent` callback runs on each member's content
 * before joining — the clip-to-markdown path uses it to convert HTML to
 * Markdown while the JSON export passes content verbatim.
 */
export function collapseGroupsForExport(
  highlights: AnyHighlightData[],
  transformContent?: (content: string) => string,
): ExportedHighlight[] {
  const groups = groupHighlights(highlights);
  return groups.map((group) => {
    const texts = group.map((h) => (transformContent ? transformContent(h.content) : h.content));
    const allNotes = group.flatMap((h) => h.notes ?? []);
    return {
      text: texts.join('\n\n'),
      timestamp: new Date().toISOString(),
      ...(allNotes.length > 0 ? { notes: allNotes } : {}),
    };
  });
}
