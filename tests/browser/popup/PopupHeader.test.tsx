// tests/browser/popup/PopupHeader.test.tsx
//
// Browser-mode tests for the popup header. Verifies the title, theme toggle
// dropdown, and gear settings button behave as expected.

import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';

import { PopupHeader } from '@presentation/popup/components/PopupHeader';

const NOOP = (): void => undefined;

describe('PopupHeader — rendering', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the app title', () => {
    render(<PopupHeader theme="dark" onTheme={NOOP} onSettings={NOOP} />);
    expect(screen.getByText('Web Harvester')).not.toBeNull();
  });

  it('has a data-testid of popup-header', () => {
    render(<PopupHeader theme="dark" onTheme={NOOP} onSettings={NOOP} />);
    expect(screen.getByTestId('popup-header')).not.toBeNull();
  });

  it('renders the settings button', () => {
    render(<PopupHeader theme="dark" onTheme={NOOP} onSettings={NOOP} />);
    expect(screen.getByTestId('header-settings-btn')).not.toBeNull();
  });
});

describe('PopupHeader — settings button', () => {
  afterEach(() => {
    cleanup();
  });

  it('calls onSettings when the gear button is clicked', async () => {
    const user = userEvent.setup();
    let called = false;
    render(
      <PopupHeader
        theme="dark"
        onTheme={NOOP}
        onSettings={() => {
          called = true;
        }}
      />,
    );
    await user.click(screen.getByTestId('header-settings-btn'));
    expect(called).toBe(true);
  });
});

describe('PopupHeader — theme menu', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens theme menu when theme button is clicked', async () => {
    const user = userEvent.setup();
    render(<PopupHeader theme="dark" onTheme={NOOP} onSettings={NOOP} />);
    await user.click(screen.getByTestId('header-theme-btn'));
    expect(screen.getByText('Light')).not.toBeNull();
    expect(screen.getByText('Dark')).not.toBeNull();
    expect(screen.getByText('System')).not.toBeNull();
  });

  it('calls onTheme with correct value when menu item clicked', async () => {
    const user = userEvent.setup();
    let chosen: string | null = null;
    render(
      <PopupHeader
        theme="dark"
        onTheme={(t) => {
          chosen = t;
        }}
        onSettings={NOOP}
      />,
    );
    await user.click(screen.getByTestId('header-theme-btn'));
    await user.click(screen.getByText('Light'));
    expect(chosen).toBe('light');
  });
});
