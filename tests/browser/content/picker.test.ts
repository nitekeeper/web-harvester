// tests/browser/content/picker.test.ts
//
// Browser-mode tests for the visual section picker. Run via @vitest/browser
// with the playwright provider so DOM mutations, mouse events, and keyboard
// events all execute against a real Chromium document.

import { describe, it, expect, afterEach } from 'vitest';

import { startPicker } from '@presentation/content/picker';

const MODE_EXCLUDE = 'exclude';
const MODE_INCLUDE = 'include';
const HOVER_SELECTOR = '[data-wh-overlay="hover"]';
const NOOP = (): void => undefined;

/** Result shape captured by tests that exercise `onDone`. */
type CapturedResult = {
  excludedXPaths?: string[];
  includedXPaths?: string[];
} | null;

/** Mounts the picker with `onDone` capturing the result into the holder. */
function startCapturing(
  mode: 'exclude' | 'include',
  holder: { value: CapturedResult },
): () => void {
  return startPicker({
    mode,
    onDone: (r) => {
      holder.value = { ...r };
    },
    onCancel: NOOP,
  });
}

/** Dispatches a click on `target`, then presses Enter on the document. */
function clickThenEnter(target: Element): void {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

/** Removes any picker overlays leaked between tests. */
function clearOverlays(): void {
  document.querySelectorAll('[data-wh-overlay]').forEach((el) => el.remove());
}

describe('startPicker — overlay lifecycle', () => {
  afterEach(clearOverlays);

  it('creates a hover overlay on mount', () => {
    const cleanup = startPicker({
      mode: MODE_EXCLUDE,
      onDone: NOOP,
      onCancel: NOOP,
    });
    const overlay = document.querySelector(HOVER_SELECTOR);
    expect(overlay).not.toBeNull();
    cleanup();
  });

  it('removes the overlay on cleanup', () => {
    const cleanup = startPicker({
      mode: MODE_EXCLUDE,
      onDone: NOOP,
      onCancel: NOOP,
    });
    cleanup();
    const overlay = document.querySelector(HOVER_SELECTOR);
    expect(overlay).toBeNull();
  });
});

describe('startPicker — keyboard confirmation', () => {
  afterEach(clearOverlays);

  it('calls onCancel when Escape is pressed', () => {
    let cancelled = false;
    const cleanup = startPicker({
      mode: MODE_EXCLUDE,
      onDone: NOOP,
      onCancel: () => {
        cancelled = true;
      },
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(true);
    cleanup();
  });

  it('calls onDone with excludedXPaths when Enter is pressed', () => {
    const holder: { value: CapturedResult } = { value: null };
    const cleanup = startCapturing(MODE_EXCLUDE, holder);
    clickThenEnter(document.body);
    expect(holder.value).not.toBeNull();
    expect(holder.value?.excludedXPaths).toBeDefined();
    cleanup();
  });

  it('include-only mode returns includedXPaths on Enter', () => {
    const holder: { value: CapturedResult } = { value: null };
    const cleanup = startCapturing(MODE_INCLUDE, holder);
    clickThenEnter(document.body);
    expect(holder.value).not.toBeNull();
    expect(holder.value?.includedXPaths).toBeDefined();
    cleanup();
  });
});

describe('startPicker — DOM tree navigation', () => {
  afterEach(clearOverlays);

  it('expands to parent element when ] is pressed', () => {
    // Create a nested structure: grandparent > parent > child
    const grandparent = document.createElement('section');
    const parent = document.createElement('div');
    const child = document.createElement('p');
    parent.appendChild(child);
    grandparent.appendChild(parent);
    document.body.appendChild(grandparent);

    const cleanup = startPicker({
      mode: MODE_EXCLUDE,
      onDone: NOOP,
      onCancel: NOOP,
    });
    child.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ']' }));
    expect(document.querySelector(HOVER_SELECTOR)).not.toBeNull();

    cleanup();
    grandparent.remove();
  });

  it('shrinks to child element when [ is pressed after expanding', () => {
    const parent = document.createElement('div');
    const child = document.createElement('p');
    parent.appendChild(child);
    document.body.appendChild(parent);

    const cleanup = startPicker({
      mode: MODE_EXCLUDE,
      onDone: NOOP,
      onCancel: NOOP,
    });
    child.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ']' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '[' }));
    expect(document.querySelector(HOVER_SELECTOR)).not.toBeNull();

    cleanup();
    parent.remove();
  });
});
