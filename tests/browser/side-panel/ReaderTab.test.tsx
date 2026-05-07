import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defaultReaderSettings } from '@application/ReaderService';
import { ReaderTab } from '@presentation/side-panel/components/ReaderTab';
import { usePopupStore } from '@presentation/stores/usePopupStore';
import { useReaderStore } from '@presentation/stores/useReaderStore';

const SETTINGS_SELECTOR = '[data-testid="reader-settings"]';

describe('ReaderTab', () => {
  beforeEach(() => {
    usePopupStore.setState({ isReaderActive: false });
    useReaderStore.setState({ settings: defaultReaderSettings() });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    const { container } = render(<ReaderTab />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the reader toggle button', () => {
    render(<ReaderTab />);
    expect(document.querySelector('[data-testid="reader-toggle"]')).not.toBeNull();
  });

  it('does not show the settings panel when reader mode is inactive', () => {
    render(<ReaderTab />);
    expect(document.querySelector(SETTINGS_SELECTOR)).toBeNull();
  });

  it('shows the settings panel after the toggle is clicked', async () => {
    render(<ReaderTab />);
    const toggle = document.querySelector('[data-testid="reader-toggle"]') as HTMLElement;
    await userEvent.setup().click(toggle);
    expect(document.querySelector(SETTINGS_SELECTOR)).not.toBeNull();
  });

  it('shows the settings panel immediately when reader mode is already active', () => {
    usePopupStore.setState({ isReaderActive: true });
    render(<ReaderTab />);
    expect(document.querySelector(SETTINGS_SELECTOR)).not.toBeNull();
  });

  it('show-highlights checkbox reflects the current settings value', () => {
    usePopupStore.setState({ isReaderActive: true });
    render(<ReaderTab />);
    const checkbox = document.querySelector(
      '[data-testid="reader-show-highlights"]',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(defaultReaderSettings().showHighlights);
  });
});
