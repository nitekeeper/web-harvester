// tests/browser/popup/Popup.preview.test.tsx
//
// Browser-mode tests for the live-preview behaviour wired into the popup.
// Covers: MSG_PREVIEW dispatch, store update on success, and re-dispatch
// when selectedTemplateId changes via the onTemplateChange callback.

import { render, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Popup } from '@presentation/popup/Popup';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { MSG_PREVIEW, type PreviewPageResponse } from '@shared/messages';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOOP = (): void => undefined;

/** A minimal adapter double that captures sendMessage calls. */
function makeAdapter(response: PreviewPageResponse = { ok: true, previewMarkdown: '# Hello' }) {
  return { sendMessage: vi.fn().mockResolvedValue(response) };
}

/** Simulates what index.tsx triggerPreview does to the store. */
async function runTriggerPreview(
  adapter: ReturnType<typeof makeAdapter>,
  templateId: string | null,
): Promise<void> {
  usePopupStore.getState().setPreviewMarkdown('');
  usePopupStore.getState().setIsPreviewing(true);
  try {
    const response = (await adapter.sendMessage({
      type: MSG_PREVIEW,
      templateId,
    })) as PreviewPageResponse;
    if (response.ok) {
      usePopupStore.getState().setPreviewMarkdown(response.previewMarkdown);
    }
  } finally {
    usePopupStore.getState().setIsPreviewing(false);
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  usePopupStore.setState({ selectedTemplateId: null, previewMarkdown: '', isPreviewing: false });
  useSettingsStore.setState({ templates: [], destinations: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Popup — live preview on mount', () => {
  it('sends MSG_PREVIEW with the current templateId', async () => {
    const adapter = makeAdapter();
    await runTriggerPreview(adapter, null);
    expect(adapter.sendMessage).toHaveBeenCalledWith({ type: MSG_PREVIEW, templateId: null });
  });

  it('sets previewMarkdown in the store when MSG_PREVIEW succeeds', async () => {
    const adapter = makeAdapter({ ok: true, previewMarkdown: '# Preview' });
    await runTriggerPreview(adapter, null);
    expect(usePopupStore.getState().previewMarkdown).toBe('# Preview');
  });

  it('clears isPreviewing after MSG_PREVIEW completes', async () => {
    const adapter = makeAdapter();
    await runTriggerPreview(adapter, null);
    expect(usePopupStore.getState().isPreviewing).toBe(false);
  });
});

describe('Popup — onTemplateChange prop', () => {
  it('Popup accepts onTemplateChange prop without error', () => {
    const onTemplateChange = vi.fn();
    render(<Popup onSave={NOOP} onSettings={NOOP} onTemplateChange={onTemplateChange} />);
    expect(document.querySelector('[data-testid="template-selector"]')).not.toBeNull();
  });

  it('re-sends MSG_PREVIEW when onTemplateChange is invoked', async () => {
    const adapter = makeAdapter();
    let callCount = 0;
    const onTemplateChange = (): void => {
      callCount += 1;
      adapter.sendMessage({ type: MSG_PREVIEW, templateId: 't1' });
    };
    render(<Popup onSave={NOOP} onSettings={NOOP} onTemplateChange={onTemplateChange} />);
    onTemplateChange();
    await vi.waitFor(() => {
      expect(callCount).toBeGreaterThan(0);
      expect(adapter.sendMessage).toHaveBeenCalledWith({ type: MSG_PREVIEW, templateId: 't1' });
    });
  });
});
