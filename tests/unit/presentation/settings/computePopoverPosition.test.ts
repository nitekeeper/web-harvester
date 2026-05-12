// tests/unit/presentation/settings/computePopoverPosition.test.ts

import { describe, expect, it } from 'vitest';

import { computePopoverPosition } from '@presentation/settings/sections/templates/VariablePicker';

function mockRect(top: number, bottom: number, left: number): DOMRect {
  return {
    top,
    bottom,
    left,
    right: left + 10,
    width: 10,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('computePopoverPosition', () => {
  it('positions below anchor with 4px gap', () => {
    const rect = mockRect(100, 130, 50);
    const result = computePopoverPosition(rect, 1024);
    expect(result.top).toBe(134);
    expect(result.left).toBe(50);
    expect(result.position).toBe('fixed');
  });

  it('clamps left so the 280px wide popover stays within viewport', () => {
    const rect = mockRect(100, 130, 800);
    const result = computePopoverPosition(rect, 1024);
    expect(result.left).toBe(1024 - 284);
  });

  it('does not produce negative left values', () => {
    const rect = mockRect(100, 130, 0);
    const result = computePopoverPosition(rect, 1024);
    expect(result.left).toBeGreaterThanOrEqual(0);
  });
});
