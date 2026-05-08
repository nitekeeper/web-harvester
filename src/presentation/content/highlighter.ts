// src/presentation/content/highlighter.ts
/* eslint-disable no-restricted-syntax */

import { getElementXPath, getElementByXPath } from '@shared/dom-utils';
import { normalizeUrl, BLOCK_HIGHLIGHT_TAGS, type AnyHighlightData } from '@shared/highlighter';
import { createLogger } from '@shared/logger';

const logger = createLogger('highlighter');

const SAVE_FAILED_MSG = 'save highlights failed';

/** Tag names that trigger a new highlight range when the selection crosses them. */
const TEXT_BLOCK_SPLIT_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'BLOCKQUOTE',
  'FIGCAPTION',
  'TD',
  'TH',
]);

let highlights: AnyHighlightData[] = [];
let pageUrl: string = normalizeUrl(window.location.href);
let isActive = false;

/** Generates a short unique highlight id. */
function generateId(): string {
  // eslint-disable-next-line sonarjs/pseudo-random -- non-security id disambiguator
  return `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Returns the chrome.storage key for the current page. */
function storageKey(): string {
  return `highlights:${pageUrl}`;
}

/** Loads persisted highlights from chrome.storage.local for the current page. */
async function loadHighlights(): Promise<void> {
  const key = storageKey();
  const result = await chrome.storage.local.get(key);
  const resultMap = result as Record<string, unknown>;
  const hasKey = Object.prototype.hasOwnProperty.call(resultMap, key);
  // eslint-disable-next-line security/detect-object-injection -- key is our own storageKey() output
  const stored: unknown = hasKey ? resultMap[key] : undefined;
  highlights = Array.isArray(stored) ? (stored as AnyHighlightData[]) : [];
}

/** Persists current highlights to chrome.storage.local for the current page. */
async function saveHighlights(): Promise<void> {
  await chrome.storage.local.set({ [storageKey()]: highlights });
}

/** Wraps the target text range inside a highlight <mark> element. */
function applyTextMark(h: AnyHighlightData & { type: 'text' }, el: Element): void {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }

  let offset = 0;
  for (const textNode of textNodes) {
    const start = offset;
    const end = offset + textNode.length;
    if (start <= h.startOffset && h.endOffset <= end) {
      const range = document.createRange();
      range.setStart(textNode, h.startOffset - start);
      range.setEnd(textNode, h.endOffset - start);
      const mark = document.createElement('mark');
      mark.className = 'wh-highlight';
      mark.dataset.hlId = h.id;
      mark.addEventListener('click', () => {
        removeHighlightById(h.id);
      });
      try {
        range.surroundContents(mark);
      } catch {
        /* cross-element range — skip */
      }
      return;
    }
    offset = end;
  }
}

/** Applies a single highlight to the DOM, wrapping text or element as appropriate. */
function applyMark(h: AnyHighlightData): void {
  const el = getElementByXPath(h.xpath, document);
  if (!el) return;

  if (h.type === 'element') {
    const mark = document.createElement('mark');
    mark.className = 'wh-highlight';
    mark.dataset.hlId = h.id;
    mark.addEventListener('click', () => {
      removeHighlightById(h.id);
    });
    el.insertAdjacentElement('beforebegin', mark);
    mark.appendChild(el);
    return;
  }

  applyTextMark(h, el);
}

/** Applies all loaded highlights to the current document. */
function applyHighlights(): void {
  for (const h of highlights) {
    applyMark(h);
  }
}

/** Removes all highlight <mark> elements, unwrapping their children. */
function removeMarks(): void {
  document.querySelectorAll('mark.wh-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
}

/** Syncs the highlight count shown in the floating menu. */
function updateFloatingMenu(): void {
  const countEl = document.querySelector('.wh-highlight-count');
  if (countEl) {
    countEl.textContent = `✦ ${highlights.length} highlight${highlights.length === 1 ? '' : 's'}`;
  }
}

/** Removes a single highlight by id: unwraps its <mark>, updates storage, and refreshes the menu. */
function removeHighlightById(id: string): void {
  const mark = document.querySelector(`mark.wh-highlight[data-hl-id="${id}"]`);
  if (mark) {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    }
  }
  highlights = highlights.filter((h) => h.id !== id);
  saveHighlights().catch((err: unknown) => {
    logger.error(SAVE_FAILED_MSG, err);
  });
  updateFloatingMenu();
}

/** Removes all highlights for the current page from the DOM and from storage. */
function clearAllHighlights(): void {
  removeMarks();
  highlights = [];
  saveHighlights().catch((err: unknown) => {
    logger.error(SAVE_FAILED_MSG, err);
  });
  updateFloatingMenu();
}

/** Creates and appends the floating highlight-mode menu to the document body. */
function injectFloatingMenu(): void {
  const style = document.createElement('style');
  style.id = 'wh-highlight-styles';
  style.textContent = `.wh-highlight-menu{position:fixed;bottom:16px;right:16px;z-index:2147483647;display:flex;align-items:center;gap:8px;background:#1e1e1e;color:#fff;padding:8px 12px;border-radius:6px;font-family:system-ui,sans-serif;font-size:14px}.wh-highlight-exit{background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer}.wh-highlight-clear{background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer}mark.wh-highlight{background:rgba(255,220,0,.4);border-radius:2px}`;
  document.head.appendChild(style);

  const menu = document.createElement('div');
  menu.className = 'wh-highlight-menu';
  menu.innerHTML = `<span class="wh-highlight-count">✦ 0 highlights</span><button class="wh-highlight-clear">Clear all</button><button class="wh-highlight-exit">Exit</button>`;

  const exitBtn = menu.querySelector('.wh-highlight-exit');
  exitBtn?.addEventListener('click', () => {
    deactivateHighlighter();
    chrome.runtime.sendMessage({ type: 'highlight-mode-exited' }).catch((err: unknown) => {
      logger.error('highlight-mode-exited send failed', err);
    });
  });

  const clearBtn = menu.querySelector('.wh-highlight-clear');
  clearBtn?.addEventListener('click', () => {
    clearAllHighlights();
  });

  document.body.appendChild(menu);
  updateFloatingMenu();
}

/** Removes the floating menu and its associated styles from the document. */
function removeFloatingMenu(): void {
  document.querySelector('.wh-highlight-menu')?.remove();
  document.getElementById('wh-highlight-styles')?.remove();
}

/** Builds an element highlight from a selection that targets a block element. */
function buildElementHighlight(el: Element): AnyHighlightData {
  return {
    type: 'element',
    id: generateId(),
    xpath: getElementXPath(el),
    content: el.outerHTML,
    text: el.textContent?.trim() ?? '',
  };
}

/** Builds a simple text highlight when the host element is not a split-tag block. */
function buildSimpleTextHighlight(range: Range): AnyHighlightData {
  const simpleEl = range.startContainer.parentElement ?? document.body;
  let charOffset = 0;
  const walker = document.createTreeWalker(simpleEl, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode() as Text | null;
  while (textNode && textNode !== range.startContainer) {
    charOffset += textNode.length;
    textNode = walker.nextNode() as Text | null;
  }
  const selectedText = range.toString().trim();
  const start = charOffset + range.startOffset;
  return {
    type: 'text',
    id: generateId(),
    xpath: getElementXPath(simpleEl),
    content: selectedText,
    text: selectedText,
    startOffset: start,
    endOffset: start + selectedText.length,
  };
}

/** Builds a block-scoped text highlight for a selection within a TEXT_BLOCK_SPLIT_TAGS element. */
function buildBlockTextHighlight(range: Range, hostEl: Element): AnyHighlightData {
  const selectedText = range.toString().trim();
  return {
    type: 'text',
    id: generateId(),
    xpath: getElementXPath(hostEl),
    content: selectedText,
    text: selectedText,
    startOffset: range.startOffset,
    endOffset: range.startOffset + selectedText.length,
  };
}

/** Converts a DOM Range into one or more highlight data objects. */
function getHighlightRanges(range: Range): AnyHighlightData[] {
  const { startContainer } = range;

  const startEl =
    startContainer.nodeType === Node.ELEMENT_NODE
      ? (startContainer as Element)
      : startContainer.parentElement;

  if (startEl && BLOCK_HIGHLIGHT_TAGS.has(startEl.tagName)) {
    return [buildElementHighlight(startEl)];
  }

  const selectedText = range.toString().trim();
  if (!selectedText) return [];

  const hostEl = startContainer.parentElement;
  if (!hostEl || !TEXT_BLOCK_SPLIT_TAGS.has(hostEl.tagName)) {
    return [buildSimpleTextHighlight(range)];
  }

  return [buildBlockTextHighlight(range, hostEl)];
}

/** Returns a new array with incoming highlights merged, skipping exact duplicates. */
function mergeOverlappingHighlights(
  existing: AnyHighlightData[],
  incoming: AnyHighlightData[],
): AnyHighlightData[] {
  const merged = [...existing];
  for (const h of incoming) {
    const duplicate = merged.some(
      (e) =>
        e.xpath === h.xpath &&
        e.type === 'text' &&
        h.type === 'text' &&
        e.startOffset === h.startOffset &&
        e.endOffset === h.endOffset,
    );
    if (!duplicate) merged.push(h);
  }
  return merged;
}

/** Handles a completed text selection, creating and persisting the new highlight. */
function handleTextSelection(sel: Selection): void {
  if (sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const newHighlights = getHighlightRanges(range);
  if (newHighlights.length === 0) return;
  highlights = mergeOverlappingHighlights(highlights, newHighlights);
  saveHighlights().catch((err: unknown) => {
    logger.error(SAVE_FAILED_MSG, err);
  });
  for (const h of newHighlights) {
    applyMark(h);
  }
  updateFloatingMenu();
  sel.removeAllRanges();
}

/** Mouseup handler that triggers highlight creation on text selection. */
function handleMouseUp(): void {
  const sel = window.getSelection();
  if (sel) handleTextSelection(sel);
}

/** Activates highlight mode: loads persisted highlights, applies them, shows the floating menu. */
export async function activateHighlighter(): Promise<void> {
  if (isActive) return;
  pageUrl = normalizeUrl(window.location.href);
  await loadHighlights();
  applyHighlights();
  injectFloatingMenu();
  document.addEventListener('mouseup', handleMouseUp);
  isActive = true;
}

/** Deactivates highlight mode: removes marks, hides the floating menu, clears the listener. */
export function deactivateHighlighter(): void {
  if (!isActive) return;
  removeMarks();
  removeFloatingMenu();
  document.removeEventListener('mouseup', handleMouseUp);
  isActive = false;
}
