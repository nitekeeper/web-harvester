// tests/browser/settings/ThemeSection.test.tsx
//
// Browser-mode tests for the settings theme section. Asserts the radio
// rendering, theme change handler, token editor display, and import error
// surfacing.

import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';

import { ThemeSection } from '@presentation/settings/sections/ThemeSection';

const NOOP_IMPORT: (json: string) => Promise<void> = async () => undefined;

const defaultProps = {
  currentTheme: 'system' as const,
  colorTokens: {} as Record<string, string>,
  onThemeChange: (): void => undefined,
  onTokensChange: (): void => undefined,
  onExportTokens: (): string => '{}',
  onImportTokens: NOOP_IMPORT,
};

describe('ThemeSection — rendering', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders theme options', () => {
    render(<ThemeSection {...defaultProps} />);
    expect(screen.getByText(/light/i)).toBeDefined();
    expect(screen.getByText(/dark/i)).toBeDefined();
    expect(screen.getByText(/system/i)).toBeDefined();
  });

  it('shows the token editor with current tokens', () => {
    render(<ThemeSection {...defaultProps} colorTokens={{ '--primary': '#3b82f6' }} />);
    expect(screen.getByDisplayValue(/#3b82f6/)).toBeDefined();
  });
});

describe('ThemeSection — interactions', () => {
  afterEach(() => {
    cleanup();
  });

  it('calls onThemeChange when a theme is selected', async () => {
    const user = userEvent.setup();
    let selected: string | null = null;
    render(
      <ThemeSection
        {...defaultProps}
        onThemeChange={(theme) => {
          selected = theme;
        }}
      />,
    );
    await user.click(screen.getByLabelText(/dark/i));
    expect(selected).toBe('dark');
  });

  it('shows validation error for invalid JSON import', async () => {
    const user = userEvent.setup();
    render(
      <ThemeSection
        {...defaultProps}
        onImportTokens={async (json) => {
          if (json === '{bad}') throw new Error('Invalid JSON');
        }}
      />,
    );
    const importInput = screen.getByTestId('import-tokens-input');
    await user.type(importInput, '{bad}');
    await user.click(screen.getByTestId('import-tokens-submit'));
    const errorEl = screen.queryByRole('alert');
    expect(errorEl).not.toBeNull();
  });
});
