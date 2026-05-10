// src/presentation/content/content.ts
//
// Content script entry point. Listens for picker control messages from the
// extension service worker and mounts the visual section picker on demand.
// Allowed to use `chrome.runtime.onMessage` directly because content scripts
// are extension entry points without an adapter wrapper available.

/* eslint-disable no-restricted-syntax */

import type { ReaderSettings } from '@application/ReaderService';
import { createLogger } from '@shared/logger';
import {
  MSG_PICKER_RESULT,
  MSG_EXTRACT_SELECTORS,
  MSG_START_CSS_PICKER,
  MSG_STOP_CSS_PICKER,
  MSG_CSS_PICKER_RESULT,
} from '@shared/messages';

import { defuddleParseAll } from './defuddleParse';
import { generateSelector } from './generateSelector';
import { activateHighlighter, deactivateHighlighter } from './highlighter';
import { startPicker } from './picker';
import { activateReader, deactivateReader } from './reader';

const logger = createLogger('content');

/** Inbound message envelope sent from the background service worker. */
type IncomingMessage =
  | { type: 'START_PICKER'; mode: 'exclude' | 'include' }
  | { type: 'STOP_PICKER' }
  | { type: 'getHtml' }
  | { type: 'READER_ACTIVATE'; settings: ReaderSettings }
  | { type: 'READER_DEACTIVATE' }
  | { type: 'START_HIGHLIGHT' }
  | { type: 'STOP_HIGHLIGHT' }
  | { type: typeof MSG_EXTRACT_SELECTORS; selectors: readonly string[] }
  | { type: typeof MSG_START_CSS_PICKER }
  | { type: typeof MSG_STOP_CSS_PICKER };

let activePicker: (() => void) | null = null;

/** Tears down any running picker so a fresh session can start cleanly. */
function stopActivePicker(): void {
  if (activePicker) {
    activePicker();
    activePicker = null;
  }
}

let cssPickerCleanup: (() => void) | null = null;

/** Tears down any running CSS picker overlay. */
function stopCssPicker(): void {
  if (cssPickerCleanup) {
    cssPickerCleanup();
    cssPickerCleanup = null;
  }
}

/**
 * Handles a START_PICKER message: mounts the picker, acknowledges immediately,
 * and sends a separate PICKER_RESULT message when the session ends. Returning
 * false (no long-lived channel) prevents the MV3 "channel closed before
 * response" error that occurs when the service worker is suspended during the
 * picker interaction.
 */
function handleStartPicker(
  message: { type: 'START_PICKER'; mode: 'exclude' | 'include' },
  sendResponse: (response: unknown) => void,
): false {
  stopActivePicker();
  activePicker = startPicker({
    mode: message.mode,
    onDone: (result) => {
      activePicker = null;
      chrome.runtime.sendMessage({ type: MSG_PICKER_RESULT, result }).catch((err: unknown) => {
        logger.error('picker result send failed', err);
      });
    },
    onCancel: () => {
      activePicker = null;
      chrome.runtime.sendMessage({ type: MSG_PICKER_RESULT }).catch((err: unknown) => {
        logger.error('picker cancel send failed', err);
      });
    },
  });
  sendResponse({ ok: true });
  return false;
}

/**
 * Extracts article markdown and page metadata from the live document using
 * Defuddle (browser bundle) + TurndownService, then calls `sendResponse` with
 * `{ html, markdown, description, author, published, tags, image, site, wordCount }`.
 * Runs in the page context where native DOM APIs are always available.
 */
async function extractPageContent(sendResponse: (r: unknown) => void): Promise<void> {
  const html = document.documentElement.outerHTML;
  let markdown = '';
  let meta = {
    description: '',
    author: '',
    published: '',
    tags: '',
    image: '',
    site: '',
    wordCount: 0,
  };
  try {
    const result = defuddleParseAll(document, window.location.href);
    markdown = result.markdown;
    meta = result.meta;
  } catch (err: unknown) {
    logger.error('Defuddle extraction failed', err);
  }
  sendResponse({ html, markdown, ...meta });
}

/** Handles highlighter control messages. */
function handleHighlighterMessage(
  message: { type: 'START_HIGHLIGHT' } | { type: 'STOP_HIGHLIGHT' },
  sendResponse: (response: unknown) => void,
): boolean {
  if (message.type === 'START_HIGHLIGHT') {
    activateHighlighter()
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((err: unknown) => {
        logger.error('highlight activate failed', err);
        sendResponse({ ok: false });
      });
    return true; // async response
  }

  if (message.type === 'STOP_HIGHLIGHT') {
    deactivateHighlighter();
    sendResponse({ ok: true });
  }

  return false;
}

/** Stops the active picker and acknowledges the STOP_PICKER message. */
function handleStopPicker(sendResponse: (response: unknown) => void): false {
  stopActivePicker();
  sendResponse({ type: 'PICKER_STOPPED' });
  return false;
}

/** Deactivates reader mode and acknowledges the READER_DEACTIVATE message. */
function handleReaderDeactivate(sendResponse: (response: unknown) => void): false {
  deactivateReader();
  sendResponse({ ok: true });
  return false;
}

/**
 * Resolves CSS selector expressions against the live DOM and returns a
 * record mapping each expression to the extracted text, HTML, or attribute
 * value. Synchronous — uses the `sendResponse` callback directly.
 */
function handleExtractSelectors(
  message: { type: typeof MSG_EXTRACT_SELECTORS; selectors: readonly string[] },
  sendResponse: (r: unknown) => void,
): false {
  const results: Record<string, string> = {};
  for (const expr of message.selectors) {
    const isHtml = expr.startsWith('selectorHtml:');
    const raw = isHtml ? expr.slice('selectorHtml:'.length) : expr.slice('selector:'.length);
    const parts = raw.split('?');
    const rawSelector = parts[0] ?? '';
    const attr = parts[1];
    const selector = rawSelector.trim();
    const elements = Array.from(document.querySelectorAll(selector));
    const values = elements.map((el) => {
      if (attr) return (el as HTMLElement).getAttribute(attr.trim()) ?? '';
      if (isHtml) return el.outerHTML;
      return el.textContent?.trim() ?? '';
    });
    Reflect.set(results, expr, values.join(', '));
  }
  sendResponse(results);
  return false;
}

/**
 * Builds the three event handlers used by the CSS picker overlay and returns
 * a teardown function that removes them and restores the page to its prior state.
 */
function mountCssPickerOverlay(tooltip: HTMLDivElement): () => void {
  let highlighted: Element | null = null;

  function onMouseOver(e: MouseEvent): void {
    if (!(e.target instanceof Element)) return;
    if (highlighted) (highlighted as HTMLElement).style.outline = '';
    highlighted = e.target;
    (highlighted as HTMLElement).style.outline = '2px solid #4f8ef7';
    const sel = generateSelector(highlighted);
    tooltip.textContent = `{{selector:${sel}}}`;
    tooltip.style.top = `${Math.min(e.clientY + 14, window.innerHeight - 40)}px`;
    tooltip.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 340)}px`;
  }

  function onClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (!(e.target instanceof Element)) return;
    const sel = generateSelector(e.target);
    chrome.runtime
      .sendMessage({ type: MSG_CSS_PICKER_RESULT, selector: sel })
      .catch((err: unknown) => {
        logger.error('css-picker-result send failed', err);
      });
    stopCssPicker();
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') stopCssPicker();
  }

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  return () => {
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (highlighted) (highlighted as HTMLElement).style.outline = '';
    tooltip.remove();
  };
}

/**
 * Mounts a hover overlay that highlights elements and shows their generated
 * CSS selector. On click, sends the selector to the background and tears down.
 */
function handleStartCssPicker(sendResponse: (r: unknown) => void): false {
  stopCssPicker();

  const tooltip = document.createElement('div');
  tooltip.style.cssText =
    'position:fixed;z-index:2147483647;background:#1a1a1a;color:#fff;' +
    'padding:4px 8px;border-radius:4px;font:12px monospace;pointer-events:none;' +
    'max-width:320px;word-break:break-all;box-shadow:0 2px 8px rgba(0,0,0,.4)';
  document.body.appendChild(tooltip);

  cssPickerCleanup = mountCssPickerOverlay(tooltip);
  sendResponse({ ok: true });
  return false;
}

/** Handles reader-mode messages; returns true when response is async. */
function handleReaderMessage(
  message: IncomingMessage,
  sendResponse: (r: unknown) => void,
): boolean {
  if (message.type === 'READER_ACTIVATE') {
    activateReader(message.settings)
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((err: unknown) => {
        logger.error('reader activate failed', err);
        sendResponse({ ok: false });
      });
    return true;
  }
  if (message.type === 'READER_DEACTIVATE') {
    return handleReaderDeactivate(sendResponse);
  }
  return false;
}

/**
 * Root message dispatcher — routes each inbound message to the appropriate
 * handler and returns the correct keep-alive boolean for MV3.
 */
function onMessage(msg: unknown, _sender: unknown, sendResponse: (r: unknown) => void): boolean {
  const message = msg as IncomingMessage;

  if (message.type === 'START_PICKER') return handleStartPicker(message, sendResponse);
  if (message.type === 'STOP_PICKER') return handleStopPicker(sendResponse);

  if (message.type === 'getHtml') {
    extractPageContent(sendResponse).catch((err: unknown) => {
      logger.error('getHtml handler failed', err);
      sendResponse({ html: document.documentElement.outerHTML, markdown: '' });
    });
    return true;
  }

  if (message.type === 'READER_ACTIVATE' || message.type === 'READER_DEACTIVATE') {
    return handleReaderMessage(message, sendResponse);
  }

  if (message.type === 'START_HIGHLIGHT' || message.type === 'STOP_HIGHLIGHT') {
    return handleHighlighterMessage(message, sendResponse);
  }

  if (message.type === MSG_EXTRACT_SELECTORS) return handleExtractSelectors(message, sendResponse);
  if (message.type === MSG_START_CSS_PICKER) return handleStartCssPicker(sendResponse);

  if (message.type === MSG_STOP_CSS_PICKER) {
    stopCssPicker();
    sendResponse({ ok: true });
    return false;
  }

  return false;
}

chrome.runtime.onMessage.addListener(onMessage);

logger.info('Content script loaded');
