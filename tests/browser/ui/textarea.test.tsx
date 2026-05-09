// tests/browser/ui/textarea.test.tsx
//
// Browser-mode tests for the Textarea UI primitive.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { Textarea } from '@presentation/components/ui/textarea';

describe('Textarea', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with rounded-sm for the medium-container radius', () => {
    render(<Textarea />);
    const el = document.querySelector('[data-slot="textarea"]');
    expect(el?.classList.contains('rounded-sm')).toBe(true);
  });
});
