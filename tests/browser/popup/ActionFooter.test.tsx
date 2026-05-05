// tests/browser/popup/ActionFooter.test.tsx
//
// Browser-mode tests for the popup ActionFooter — the two-row composite that
// combines the primary "Clip Page" button, three icon-only mode toggles
// (section picker, highlight, reader), and the StatusBar status row.

import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';

import { ActionFooter } from '@presentation/popup/components/ActionFooter';

const NOOP = (): void => undefined;

const defaultProps = {
  isSaving: false,
  isDisabled: false,
  onSave: NOOP,
  isPickerActive: false,
  isHighlightActive: false,
  isReaderActive: false,
  onPickerToggle: NOOP,
  onHighlightToggle: NOOP,
  onReaderToggle: NOOP,
  saveStatus: 'idle' as const,
  saveDestinationLabel: null,
};

describe('ActionFooter — labels and structure', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Clip Page button', () => {
    render(<ActionFooter {...defaultProps} />);
    expect(screen.getByText('Clip Page')).not.toBeNull();
  });

  it('shows Saving… label when isSaving is true', () => {
    render(<ActionFooter {...defaultProps} isSaving={true} />);
    expect(screen.getByText('Saving…')).not.toBeNull();
  });

  it('disables Clip Page when isDisabled is true', () => {
    render(<ActionFooter {...defaultProps} isDisabled={true} />);
    const btn = screen.getByText('Clip Page').closest('button');
    expect(btn).not.toBeNull();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders all three icon toggle buttons', () => {
    render(<ActionFooter {...defaultProps} />);
    expect(document.querySelector('[data-testid="footer-picker-btn"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="footer-highlight-btn"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="footer-reader-btn"]')).not.toBeNull();
  });

  it('renders the status bar', () => {
    render(<ActionFooter {...defaultProps} />);
    expect(document.querySelector('[data-testid="status-bar"]')).not.toBeNull();
  });
});

describe('ActionFooter — interactions', () => {
  afterEach(() => {
    cleanup();
  });

  it('calls onSave when Clip Page is clicked', async () => {
    let called = false;
    const onSave = (): void => {
      called = true;
    };
    render(<ActionFooter {...defaultProps} onSave={onSave} />);
    await userEvent.setup().click(screen.getByText('Clip Page'));
    expect(called).toBe(true);
  });

  it('calls onPickerToggle when picker button is clicked', async () => {
    let called = false;
    const onPickerToggle = (): void => {
      called = true;
    };
    render(<ActionFooter {...defaultProps} onPickerToggle={onPickerToggle} />);
    const pickerBtn = document.querySelector('[data-testid="footer-picker-btn"]');
    expect(pickerBtn).not.toBeNull();
    await userEvent.setup().click(pickerBtn as HTMLElement);
    expect(called).toBe(true);
  });
});
