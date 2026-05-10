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
} from '@shared/messages';

import { defuddleParseAll } from './defuddleParse';
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

chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse): boolean => {
  const message = msg as IncomingMessage;

  if (message.type === 'START_PICKER') {
    return handleStartPicker(message, sendResponse);
  }

  if (message.type === 'STOP_PICKER') {
    return handleStopPicker(sendResponse);
  }

  if (message.type === 'getHtml') {
    extractPageContent(sendResponse).catch((err: unknown) => {
      logger.error('getHtml handler failed', err);
      sendResponse({ html: document.documentElement.outerHTML, markdown: '' });
    });
    return true;
  }

  if (message.type === 'READER_ACTIVATE') {
    activateReader(message.settings)
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((err: unknown) => {
        logger.error('reader activate failed', err);
        sendResponse({ ok: false });
      });
    return true; // async response
  }

  if (message.type === 'READER_DEACTIVATE') {
    return handleReaderDeactivate(sendResponse);
  }

  if (message.type === 'START_HIGHLIGHT' || message.type === 'STOP_HIGHLIGHT') {
    return handleHighlighterMessage(message, sendResponse);
  }

  if (message.type === MSG_EXTRACT_SELECTORS) {
    return handleExtractSelectors(message, sendResponse);
  }

  return false;
});

logger.info('Content script loaded');
