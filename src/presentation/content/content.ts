// src/presentation/content/content.ts
//
// Content script entry point. Listens for picker control messages from the
// extension service worker and mounts the visual section picker on demand.
// Allowed to use `chrome.runtime.onMessage` directly because content scripts
// are extension entry points without an adapter wrapper available.

/* eslint-disable no-restricted-syntax */

import type { ReaderSettings } from '@application/ReaderService';
import { createLogger } from '@shared/logger';

import { defuddleParse } from './defuddleParse';
import { startPicker } from './picker';
import { activateReader, deactivateReader } from './reader';

const logger = createLogger('content');

/** Inbound message envelope sent from the background service worker. */
type IncomingMessage =
  | { type: 'START_PICKER'; mode: 'exclude' | 'include' }
  | { type: 'STOP_PICKER' }
  | { type: 'getHtml' }
  | { type: 'READER_ACTIVATE'; settings: ReaderSettings }
  | { type: 'READER_DEACTIVATE' };

let activePicker: (() => void) | null = null;

/** Tears down any running picker so a fresh session can start cleanly. */
function stopActivePicker(): void {
  if (activePicker) {
    activePicker();
    activePicker = null;
  }
}

/** Handles a START_PICKER message: mounts the picker and replies async. */
function handleStartPicker(
  message: { type: 'START_PICKER'; mode: 'exclude' | 'include' },
  sendResponse: (response: unknown) => void,
): true {
  stopActivePicker();
  activePicker = startPicker({
    mode: message.mode,
    onDone: (result) => {
      activePicker = null;
      sendResponse({ type: 'PICKER_DONE', result });
    },
    onCancel: () => {
      activePicker = null;
      sendResponse({ type: 'PICKER_CANCELLED' });
    },
  });
  // Return true to keep the message channel open for async sendResponse
  return true;
}

/**
 * Extracts article markdown from the live document using Defuddle (browser
 * bundle) + TurndownService, then calls `sendResponse` with `{ html, markdown
 * }`. Runs in the page context where native DOM APIs are always available.
 */
async function extractPageContent(sendResponse: (r: unknown) => void): Promise<void> {
  const html = document.documentElement.outerHTML;
  let markdown = '';
  try {
    markdown = defuddleParse(document, window.location.href);
  } catch (err: unknown) {
    logger.error('Defuddle extraction failed', err);
  }
  sendResponse({ html, markdown });
}

chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse): boolean => {
  const message = msg as IncomingMessage;

  if (message.type === 'START_PICKER') {
    return handleStartPicker(message, sendResponse);
  }

  if (message.type === 'STOP_PICKER') {
    stopActivePicker();
    sendResponse({ type: 'PICKER_STOPPED' });
    return false;
  }

  if (message.type === 'getHtml') {
    extractPageContent(sendResponse).catch((err: unknown) => {
      logger.error('getHtml handler failed', err);
      sendResponse({ html: document.documentElement.outerHTML, markdown: '' });
    });
    return true;
  }

  if (message.type === 'READER_ACTIVATE') {
    activateReader(message.settings).catch((err: unknown) => {
      logger.error('reader activate failed', err);
      sendResponse({ ok: false });
    });
    return true; // async response
  }

  if (message.type === 'READER_DEACTIVATE') {
    deactivateReader();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

logger.info('Content script loaded');
