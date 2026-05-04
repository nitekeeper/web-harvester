// src/presentation/content/content.ts
//
// Content script entry point. Listens for picker control messages from the
// extension service worker and mounts the visual section picker on demand.
// Allowed to use `chrome.runtime.onMessage` directly because content scripts
// are extension entry points without an adapter wrapper available.

/* eslint-disable no-restricted-syntax */

import { createLogger } from '@shared/logger';

import { startPicker } from './picker';

const logger = createLogger('content');

/** Inbound message envelope sent from the background service worker. */
type IncomingMessage =
  | { type: 'START_PICKER'; mode: 'exclude' | 'include' }
  | { type: 'STOP_PICKER' };

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

chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse): boolean => {
  const message = msg as IncomingMessage;

  if (message.type === 'START_PICKER') {
    return handleStartPicker(message, sendResponse);
  }

  if (message.type === 'STOP_PICKER') {
    stopActivePicker();
    sendResponse({ type: 'PICKER_STOPPED' });
  }
  return false;
});

logger.info('Content script loaded');
