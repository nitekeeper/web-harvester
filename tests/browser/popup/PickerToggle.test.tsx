// tests/browser/popup/PickerToggle.test.tsx
//
// Browser-mode tests for the picker toggle button. Asserts English labels in
// both inactive and active states.

import { render, cleanup, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { PickerToggle } from '@presentation/popup/components/PickerToggle';

const NOOP = (): void => undefined;

describe('PickerToggle', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows "Start picker" label when not active', () => {
    render(<PickerToggle isActive={false} onToggle={NOOP} />);
    expect(screen.getByText('Start picker')).not.toBeNull();
  });

  it('shows "Stop picker" label when active', () => {
    render(<PickerToggle isActive={true} onToggle={NOOP} />);
    expect(screen.getByText('Stop picker')).not.toBeNull();
  });
});
