// tests/unit/presentation/hooks/useSaveHandler.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSaveHandler } from '@presentation/hooks/useSaveHandler';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { MSG_CLIP } from '@shared/messages';

/** Resets popup store to known state before each test. */
beforeEach(() => {
  usePopupStore.setState({
    saveStatus: 'idle',
    saveDestinationLabel: null,
    isSaving: false,
    selectedDestinationId: 'dest-1',
  });
});

describe('createSaveHandler — message dispatch', () => {
  it('sends a ClipPageMessage with the selected destinationId', async () => {
    const adapter = {
      sendMessage: vi
        .fn()
        .mockResolvedValue({ ok: true, fileName: 'note.md', destination: 'Inbox' }),
    };
    const handleSave = createSaveHandler(adapter);

    handleSave();

    await vi.waitFor(() => {
      expect(adapter.sendMessage).toHaveBeenCalledWith({
        type: MSG_CLIP,
        destinationId: 'dest-1',
      });
    });
  });

  it('does nothing when selectedDestinationId is null', () => {
    usePopupStore.setState({ selectedDestinationId: null });
    const adapter = { sendMessage: vi.fn() };
    const handleSave = createSaveHandler(adapter);

    handleSave();

    expect(adapter.sendMessage).not.toHaveBeenCalled();
    expect(usePopupStore.getState().isSaving).toBe(false);
  });
});

describe('createSaveHandler — saving state transitions', () => {
  it('sets isSaving and saveStatus to saving synchronously before the message resolves', () => {
    let isSavingDuringSend = false;
    let statusDuringSend: string | undefined;
    const adapter = {
      sendMessage: vi.fn().mockImplementation(async () => {
        isSavingDuringSend = usePopupStore.getState().isSaving;
        statusDuringSend = usePopupStore.getState().saveStatus;
        return { ok: true, fileName: 'note.md', destination: 'Inbox' };
      }),
    };
    const handleSave = createSaveHandler(adapter);

    handleSave();

    expect(usePopupStore.getState().isSaving).toBe(true);
    expect(usePopupStore.getState().saveStatus).toBe('saving');

    return vi.waitFor(() => {
      expect(isSavingDuringSend).toBe(true);
      expect(statusDuringSend).toBe('saving');
    });
  });
});

describe('createSaveHandler — success path', () => {
  it('sets saveStatus to success and stores destinationLabel on ok response', async () => {
    const adapter = {
      sendMessage: vi
        .fn()
        .mockResolvedValue({ ok: true, fileName: 'note.md', destination: 'Inbox' }),
    };
    const handleSave = createSaveHandler(adapter);

    handleSave();

    await vi.waitFor(() => {
      expect(usePopupStore.getState().saveStatus).toBe('success');
    });
    expect(usePopupStore.getState().saveDestinationLabel).toBe('Inbox');
    expect(usePopupStore.getState().isSaving).toBe(false);
  });
});

describe('createSaveHandler — error paths', () => {
  it('sets saveStatus to error on ok:false response', async () => {
    const adapter = {
      sendMessage: vi.fn().mockResolvedValue({ ok: false, error: 'clip aborted' }),
    };
    const handleSave = createSaveHandler(adapter);

    handleSave();

    await vi.waitFor(() => {
      expect(usePopupStore.getState().saveStatus).toBe('error');
    });
    expect(usePopupStore.getState().isSaving).toBe(false);
  });

  it('sets saveStatus to error when sendMessage rejects', async () => {
    const adapter = {
      sendMessage: vi.fn().mockRejectedValue(new Error('network error')),
    };
    const handleSave = createSaveHandler(adapter);

    handleSave();

    await vi.waitFor(() => {
      expect(usePopupStore.getState().saveStatus).toBe('error');
    });
    expect(usePopupStore.getState().isSaving).toBe(false);
  });
});

describe('createSaveHandler — pre-flight dispatch', () => {
  it('calls preFlight with the selected destinationId before sending', async () => {
    const preFlight = vi.fn().mockResolvedValue(true);
    const adapter = {
      sendMessage: vi
        .fn()
        .mockResolvedValue({ ok: true, fileName: 'note.md', destination: 'Inbox' }),
    };
    const handleSave = createSaveHandler(adapter, preFlight);

    handleSave();

    await vi.waitFor(() => {
      expect(preFlight).toHaveBeenCalledWith('dest-1');
      expect(adapter.sendMessage).toHaveBeenCalled();
    });
  });

  it('sends the message normally when no preFlight is provided', async () => {
    const adapter = {
      sendMessage: vi
        .fn()
        .mockResolvedValue({ ok: true, fileName: 'note.md', destination: 'Inbox' }),
    };
    const handleSave = createSaveHandler(adapter);

    handleSave();

    await vi.waitFor(() => {
      expect(adapter.sendMessage).toHaveBeenCalledWith({
        type: MSG_CLIP,
        destinationId: 'dest-1',
      });
    });
  });
});

describe('createSaveHandler — pre-flight failure', () => {
  it('sets saveStatus to error and skips sendMessage when preFlight returns false', async () => {
    const preFlight = vi.fn().mockResolvedValue(false);
    const adapter = { sendMessage: vi.fn() };
    const handleSave = createSaveHandler(adapter, preFlight);

    handleSave();

    await vi.waitFor(() => {
      expect(usePopupStore.getState().saveStatus).toBe('error');
    });
    expect(adapter.sendMessage).not.toHaveBeenCalled();
    expect(usePopupStore.getState().isSaving).toBe(false);
  });

  it('sets saveStatus to error and skips sendMessage when preFlight rejects', async () => {
    const preFlight = vi.fn().mockRejectedValue(new Error('Permission denied'));
    const adapter = { sendMessage: vi.fn() };
    const handleSave = createSaveHandler(adapter, preFlight);

    handleSave();

    await vi.waitFor(() => {
      expect(usePopupStore.getState().saveStatus).toBe('error');
    });
    expect(adapter.sendMessage).not.toHaveBeenCalled();
    expect(usePopupStore.getState().isSaving).toBe(false);
  });
});
