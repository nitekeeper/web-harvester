import { Defuddle } from 'defuddle/node';

import { absolutizeUrls, getElementByXPath } from '@domain/extractor/dom-utils';
import { buildTurndown } from '@shared/turndown';

/**
 * Options accepted by `extractContent`.
 *
 * - `excludedXPaths` — elements matching these XPaths are removed from the
 *   clone before conversion.
 * - `includedXPaths` — when non-empty, only elements matching these XPaths
 *   (and their ancestors) are retained; everything else under `<body>` is
 *   removed.
 * - `baseUrl` — base URL used when absolutizing relative `src`, `href`, and
 *   `srcset` attributes.
 */
export interface ExtractionOptions {
  readonly excludedXPaths?: readonly string[];
  readonly includedXPaths?: readonly string[];
  readonly baseUrl: string;
}

/**
 * Output of `extractContent`. `markdown` is the GFM-formatted body, `title`
 * is the document title (or the first `<h1>` text if `<title>` is empty),
 * and `byline` is the author meta value when present.
 */
export interface ExtractionResult {
  readonly markdown: string;
  readonly title: string;
  readonly byline: string | undefined;
}

/**
 * Extracts content from a Document and converts it to Markdown.
 *
 * Pipeline:
 *  1. Snapshot `<body>` into a detached document (avoids mutating live DOM).
 *  2. Remove excluded elements (by XPath).
 *  3. Optionally filter to only included elements (by XPath).
 *  4. Absolutize relative URLs against `options.baseUrl`.
 *  5. Convert to Markdown via TurndownService + GFM plugin.
 *  6. Read `title` from `document.title` (falls back to first `<h1>`).
 *  7. Read `byline` from `<meta name="author">` or `<meta property="article:author">`.
 */
export function extractContent(doc: Document, options: ExtractionOptions): ExtractionResult {
  const workingDoc = cloneBody(doc);

  applyExcludedXPaths(workingDoc, options.excludedXPaths);
  applyIncludedXPaths(workingDoc, options.includedXPaths);

  const absolutized = absolutizeUrls(workingDoc.body.innerHTML, options.baseUrl);
  const markdown = buildTurndown().turndown(absolutized).trim();

  return {
    markdown,
    title: extractTitle(doc),
    byline: extractByline(doc),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a fresh detached HTML document whose `<body>` mirrors the live
 * document's body. Working on a detached document lets us evaluate XPath
 * (which requires a Document context) without mutating the page.
 */
function cloneBody(doc: Document): Document {
  const clone = doc.implementation.createHTMLDocument('');
  clone.body.innerHTML = doc.body.innerHTML;
  return clone;
}

/**
 * Removes every element in `workingDoc` matched by the given XPath list.
 * XPaths that resolve to nothing are silently skipped.
 */
function applyExcludedXPaths(
  workingDoc: Document,
  excludedXPaths: readonly string[] | undefined,
): void {
  if (!excludedXPaths || excludedXPaths.length === 0) return;
  for (const xpath of excludedXPaths) {
    const el = getElementByXPath(xpath, workingDoc);
    if (el) el.remove();
  }
}

/**
 * Retains only elements matched by `includedXPaths`, their descendants, and
 * each ancestor up to `<body>`. Anything else under `<body>` is removed. A
 * no-op when `includedXPaths` is empty/undefined or yields zero matches.
 */
function applyIncludedXPaths(
  workingDoc: Document,
  includedXPaths: readonly string[] | undefined,
): void {
  if (!includedXPaths || includedXPaths.length === 0) return;

  const matchedElements = resolveMatchedElements(workingDoc, includedXPaths);
  if (matchedElements.length === 0) return;

  const ancestors = collectAncestors(workingDoc, matchedElements);
  const matchedSet = new Set<Element>(matchedElements);

  // Iterate a snapshot in document order. We remove anything that is not
  // (a) a matched element, (b) an ancestor of one, or (c) a descendant of
  // one. The `isConnected` short-circuit lets us skip nodes already pruned
  // as part of a removed subtree.
  const allElements = Array.from(workingDoc.body.querySelectorAll('*'));
  for (const el of allElements) {
    if (!el.isConnected) continue;
    if (matchedSet.has(el)) continue;
    if (ancestors.has(el)) continue;
    if (isDescendantOfAny(el, matchedElements)) continue;
    el.remove();
  }
}

/** True when `el` is contained by any of the candidate elements. */
function isDescendantOfAny(el: Element, candidates: readonly Element[]): boolean {
  for (const candidate of candidates) {
    if (candidate.contains(el) && candidate !== el) return true;
  }
  return false;
}

/** Resolves each XPath against `workingDoc`, dropping any that don't match. */
function resolveMatchedElements(
  workingDoc: Document,
  includedXPaths: readonly string[],
): Element[] {
  const matched: Element[] = [];
  for (const xpath of includedXPaths) {
    const el = getElementByXPath(xpath, workingDoc);
    if (el) matched.push(el);
  }
  return matched;
}

/**
 * Collects every ancestor of each matched element, up to (but not including)
 * `<body>`. These nodes must be retained so that the matched subtrees stay
 * reachable from `<body>`.
 */
function collectAncestors(workingDoc: Document, matchedElements: readonly Element[]): Set<Node> {
  const ancestors = new Set<Node>();
  for (const matched of matchedElements) {
    let node: Node | null = matched.parentNode;
    while (node && node !== workingDoc.body) {
      ancestors.add(node);
      node = node.parentNode;
    }
  }
  return ancestors;
}

/**
 * Returns a `DOMParser` instance. Accesses it via `self` rather than the bare
 * identifier so the Vite bundle does not hoist it into a context where it may
 * be undefined (e.g. Chrome MV3 service workers on older Chrome versions).
 * Note: `DOMParser` is not available in service workers — this path is only
 * reachable from browser-page contexts or unit tests (jsdom).
 */
function getParser(): DOMParser {
  const Ctor = (self as unknown as { DOMParser: typeof DOMParser }).DOMParser;
  return new Ctor();
}

/**
 * Extracts the document title. Prefers `document.title`, falling back to the
 * first `<h1>` text content when the title is empty.
 */
function extractTitle(doc: Document): string {
  const docTitle = doc.title.trim();
  if (docTitle) return docTitle;
  const h1 = doc.querySelector('h1');
  return h1?.textContent?.trim() ?? '';
}

/**
 * Extracts the byline from standard author meta tags. Returns `undefined`
 * when neither `<meta name="author">` nor `<meta property="article:author">`
 * is present.
 */
function extractByline(doc: Document): string | undefined {
  const authorMeta =
    doc.querySelector('meta[name="author"]') ??
    doc.querySelector('meta[property="article:author"]');
  return authorMeta?.getAttribute('content') ?? undefined;
}

/**
 * Converts an HTML string to Markdown using TurndownService configured for
 * GFM output. Unlike `extractContent`, this function operates on a raw HTML
 * string and is safe to call from a Chrome MV3 background service worker
 * where `document` is not defined. It parses the HTML via `DOMParser` (which
 * IS available in service workers) and passes the resulting DOM node to
 * TurndownService, bypassing any internal code path that would access the
 * `document` global directly.
 */
export function turndownHtml(html: string): string {
  const doc = getParser().parseFromString(html, 'text/html');
  return buildTurndown().turndown(doc.body).trim();
}

/**
 * Extracts the main article content from a full-page HTML string using
 * Defuddle (the same library used by Obsidian Clipper), then converts the
 * extracted content to GFM Markdown via TurndownService.
 *
 * Unlike `turndownHtml`, which blindly converts the entire body, this
 * function strips navigation, sidebars, ads, and other noise before
 * conversion — producing clean article Markdown even for complex SPA pages
 * (e.g. Korean news aggregators) where raw Turndown fails or returns empty.
 *
 * Safe to call from a Chrome MV3 background service worker: uses `DOMParser`
 * (available in service workers) rather than the `document` global.
 *
 * Falls back to full-body Turndown conversion if Defuddle fails to initialize
 * (e.g. UMD→ESM interop failure in the extension service worker build).
 */
export async function extractArticleMarkdown(html: string, url: string): Promise<string> {
  if (!html) return '';
  const doc = getParser().parseFromString(html, 'text/html');
  const result = await Defuddle(doc, url);
  return buildTurndown().turndown(result.content).trim();
}
