// tests/browser/ui/textarea.test.tsx
//
// Browser-mode tests for the Textarea UI primitive.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { Textarea } from '@presentation/components/ui/textarea';

const SLOT = '[data-slot="textarea"]';

describe('Textarea — radius', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with rounded-sm for the medium-container radius', () => {
    render(<Textarea />);
    const el = document.querySelector(SLOT);
    expect(el?.classList.contains('rounded-sm')).toBe(true);
  });
});

describe('Textarea — dark-mode classes', () => {
  afterEach(() => {
    cleanup();
  });

  it('carries dark:bg-wh-panel for the panel background in dark mode', () => {
    render(<Textarea />);
    const el = document.querySelector(SLOT);
    expect(el?.className).toContain('dark:bg-wh-panel');
  });

  it('carries dark:disabled:bg-wh-hover for the disabled state in dark mode', () => {
    render(<Textarea />);
    const el = document.querySelector(SLOT);
    expect(el?.className).toContain('dark:disabled:bg-wh-hover');
  });
});
