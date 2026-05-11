// tests/unit/presentation/hooks/useFormatMessage.test.ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@application/i18n/localeService', () => ({
  formatMessage: vi.fn(),
}));

import { formatMessage } from '@application/i18n/localeService';
import { useFormatMessage } from '@presentation/hooks/useFormatMessage';
import { useLocaleStore } from '@presentation/stores/useLocaleStore';

const mockFormatMessage = formatMessage as ReturnType<typeof vi.fn>;
const SAVE_BUTTON_ID = 'save-button';

beforeEach(() => {
  vi.clearAllMocks();
  useLocaleStore.setState({ locale: 'en' });
  mockFormatMessage.mockReturnValue('mocked-result');
});

describe('useFormatMessage — delegation', () => {
  it('calls formatMessage with id and values', () => {
    const { result } = renderHook(() => useFormatMessage());
    result.current({ id: SAVE_BUTTON_ID, values: { count: 2 } });
    expect(mockFormatMessage).toHaveBeenCalledWith(SAVE_BUTTON_ID, { count: 2 });
  });

  it('calls formatMessage with undefined values when none supplied', () => {
    const { result } = renderHook(() => useFormatMessage());
    result.current({ id: SAVE_BUTTON_ID });
    expect(mockFormatMessage).toHaveBeenCalledWith(SAVE_BUTTON_ID, undefined);
  });

  it('returns the value from formatMessage', () => {
    mockFormatMessage.mockReturnValue('Save');
    const { result } = renderHook(() => useFormatMessage());
    expect(result.current({ id: SAVE_BUTTON_ID })).toBe('Save');
  });

  it('returns the value from formatMessage when values are supplied', () => {
    mockFormatMessage.mockReturnValue('1 highlight');
    const { result } = renderHook(() => useFormatMessage());
    expect(result.current({ id: 'highlight-count', values: { count: 1 } })).toBe('1 highlight');
  });

  it('ignores defaultMessage — delegates to the real formatter only', () => {
    mockFormatMessage.mockReturnValue('From Bundle');
    const { result } = renderHook(() => useFormatMessage());
    // defaultMessage is present but the hook must not use it
    const output = result.current({ id: SAVE_BUTTON_ID, defaultMessage: 'Fallback' });
    expect(output).toBe('From Bundle');
    expect(mockFormatMessage).toHaveBeenCalledWith(SAVE_BUTTON_ID, undefined);
  });
});

describe('useFormatMessage — re-render on locale change', () => {
  it('re-renders when the locale store changes', async () => {
    // Use mockReturnValueOnce so each render call gets a distinct value.
    mockFormatMessage.mockReturnValueOnce('English').mockReturnValueOnce('Korean');

    const { result } = renderHook(() => useFormatMessage());
    expect(result.current({ id: 'btn' })).toBe('English');

    await act(async () => {
      useLocaleStore.setState({ locale: 'ko' });
    });

    expect(result.current({ id: 'btn' })).toBe('Korean');
  });
});
