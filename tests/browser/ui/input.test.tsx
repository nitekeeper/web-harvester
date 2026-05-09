// tests/browser/ui/input.test.tsx
//
// Browser-mode tests for the Input UI primitive.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { Input } from '@presentation/components/ui/input';

const SLOT = '[data-slot="input"]';

describe('Input — radius', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with rounded-xs for the small-input-shell radius', () => {
    render(<Input />);
    const el = document.querySelector(SLOT);
    expect(el?.classList.contains('rounded-xs')).toBe(true);
  });
});

describe('Input — dark-mode classes', () => {
  afterEach(() => {
    cleanup();
  });

  it('carries dark:bg-wh-panel for the panel background in dark mode', () => {
    render(<Input />);
    const el = document.querySelector(SLOT);
    expect(el?.className).toContain('dark:bg-wh-panel');
  });

  it('carries dark:disabled:bg-wh-hover for the disabled state in dark mode', () => {
    render(<Input />);
    const el = document.querySelector(SLOT);
    expect(el?.className).toContain('dark:disabled:bg-wh-hover');
  });

  it('carries dark:placeholder:text-wh-subtle for placeholder text in dark mode', () => {
    render(<Input />);
    const el = document.querySelector(SLOT);
    expect(el?.className).toContain('dark:placeholder:text-wh-subtle');
  });
});
