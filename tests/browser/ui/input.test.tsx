// tests/browser/ui/input.test.tsx
//
// Browser-mode tests for the Input UI primitive.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { Input } from '@presentation/components/ui/input';

describe('Input', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with rounded-xs for the small-input-shell radius', () => {
    render(<Input />);
    const el = document.querySelector('[data-slot="input"]');
    expect(el?.classList.contains('rounded-xs')).toBe(true);
  });
});
