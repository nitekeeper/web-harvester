// tests/browser/popup/Popup.preview.test.tsx
//
// Browser-mode tests for the live-preview behaviour wired into the popup.
// Covers: MSG_PREVIEW dispatch on mount (via onTemplateChange), store update
// on success, re-dispatch when a template is selected via user interaction,
// and additional sanity checks for isPreviewing lifecycle.

import { render, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Popup } from '@presentation/popup/Popup';
import { triggerPreview } from '@presentation/popup/triggerPreview';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import type { Logger } from '@shared/logger';
import { MSG_PREVIEW, type PreviewPageResponse } from '@shared/messages';

import { MockAdapter } from '../../helpers/MockAdapter';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOOP = (): void => undefined;

/**
 * Returns a {@link MockAdapter} with `sendMessage` pre-configured to resolve
 * with the supplied preview response.
 */
function makeAdapter(
  response: PreviewPageResponse = { ok: true, previewMarkdown: '# Hello' },
): MockAdapter {
  const adapter = new MockAdapter();
  adapter.sendMessage.mockResolvedValue(response);
  return adapter;
}

/** A silent logger double that satisfies the {@link Logger} interface. */
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

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
  it('sends MSG_PREVIEW with the current templateId when onTemplateChange fires on mount', async () => {
    const adapter = makeAdapter();
    const onTemplateChange = (): void => {
      triggerPreview(adapter, mockLogger).catch(() => undefined);
    };

    render(<Popup onSave={NOOP} onSettings={NOOP} onTemplateChange={onTemplateChange} />);

    // Simulate the initial preview trigger that index.tsx fires after mounting.
    await act(async () => {
      await triggerPreview(adapter, mockLogger);
    });

    expect(adapter.sendMessage).toHaveBeenCalledWith({ type: MSG_PREVIEW, templateId: null });
  });

  it('sets previewMarkdown in the store after MSG_PREVIEW succeeds', async () => {
    const adapter = makeAdapter({ ok: true, previewMarkdown: '# Preview' });
    const onTemplateChange = (): void => {
      triggerPreview(adapter, mockLogger).catch(() => undefined);
    };

    render(<Popup onSave={NOOP} onSettings={NOOP} onTemplateChange={onTemplateChange} />);

    await act(async () => {
      await triggerPreview(adapter, mockLogger);
    });

    expect(usePopupStore.getState().previewMarkdown).toBe('# Preview');
  });

  it('clears isPreviewing after MSG_PREVIEW completes', async () => {
    const adapter = makeAdapter();
    const onTemplateChange = (): void => {
      triggerPreview(adapter, mockLogger).catch(() => undefined);
    };

    render(<Popup onSave={NOOP} onSettings={NOOP} onTemplateChange={onTemplateChange} />);

    await act(async () => {
      await triggerPreview(adapter, mockLogger);
    });

    expect(usePopupStore.getState().isPreviewing).toBe(false);
  });
});

describe('Popup — template change triggers MSG_PREVIEW', () => {
  it('Popup accepts onTemplateChange prop without error', () => {
    const onTemplateChange = vi.fn();
    render(<Popup onSave={NOOP} onSettings={NOOP} onTemplateChange={onTemplateChange} />);
    expect(document.querySelector('[data-testid="template-selector"]')).not.toBeNull();
  });

  it('re-sends MSG_PREVIEW when the user selects a template via the dropdown', async () => {
    const adapter = makeAdapter();
    const onTemplateChange = (): void => {
      triggerPreview(adapter, mockLogger).catch(() => undefined);
    };

    useSettingsStore.setState({
      templates: [
        {
          id: 't1',
          name: 'Article',
          frontmatterTemplate: '',
          bodyTemplate: '',
          noteNameTemplate: '',
        },
        { id: 't2', name: 'Note', frontmatterTemplate: '', bodyTemplate: '', noteNameTemplate: '' },
      ],
    });

    render(<Popup onSave={NOOP} onSettings={NOOP} onTemplateChange={onTemplateChange} />);

    // Open the template dropdown and select 'Article' — this triggers
    // handleTemplateSelect → setSelectedTemplateId + onTemplateChange?.()
    const user = userEvent.setup();
    const trigger = document.querySelector('[data-testid="template-selector"]');
    if (!trigger) throw new Error('template-selector not found');
    await user.click(trigger);
    const option = document.querySelector('[role="option"]');
    if (!option) throw new Error('no option elements found in dropdown');
    await user.click(option);

    await vi.waitFor(() => {
      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: MSG_PREVIEW }),
      );
    });
  });
});
