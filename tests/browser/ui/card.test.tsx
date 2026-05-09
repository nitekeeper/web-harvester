// tests/browser/ui/card.test.tsx
//
// Browser-mode tests for the Card UI primitive.

import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

import { Card, CardHeader, CardFooter } from '@presentation/components/ui/card';

describe('Card', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with rounded-md for the large-card radius', () => {
    render(<Card />);
    const el = document.querySelector('[data-slot="card"]');
    expect(el?.classList.contains('rounded-md')).toBe(true);
  });

  it('CardHeader renders with rounded-t-md', () => {
    render(
      <Card>
        <CardHeader />
      </Card>,
    );
    const el = document.querySelector('[data-slot="card-header"]');
    expect(el?.classList.contains('rounded-t-md')).toBe(true);
  });

  it('CardFooter renders with rounded-b-md', () => {
    render(
      <Card>
        <CardFooter />
      </Card>,
    );
    const el = document.querySelector('[data-slot="card-footer"]');
    expect(el?.classList.contains('rounded-b-md')).toBe(true);
  });
});
