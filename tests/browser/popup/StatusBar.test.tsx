// tests/browser/popup/StatusBar.test.tsx
//
// Browser-mode tests for the popup status bar. Asserts each of the four
// save-flow states renders the expected English label.

import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { StatusBar } from '@presentation/popup/components/StatusBar';

describe('StatusBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows "Ready" when status is idle', () => {
    render(<StatusBar status="idle" destinationLabel={null} />);
    expect(screen.getByText('Ready')).not.toBeNull();
  });

  it('shows "Saving…" when status is saving', () => {
    render(<StatusBar status="saving" destinationLabel={null} />);
    expect(screen.getByText('Saving…')).not.toBeNull();
  });

  it('shows saved destination label when status is success', () => {
    render(<StatusBar status="success" destinationLabel="Reading Notes" />);
    expect(screen.getByText(/Reading Notes/)).not.toBeNull();
  });

  it('shows error message when status is error', () => {
    render(<StatusBar status="error" destinationLabel={null} errorMessage="Permission denied" />);
    expect(screen.getByText('Permission denied')).not.toBeNull();
  });

  it('has a data-testid of status-bar', () => {
    render(<StatusBar status="idle" destinationLabel={null} />);
    expect(document.querySelector('[data-testid="status-bar"]')).not.toBeNull();
  });
});
