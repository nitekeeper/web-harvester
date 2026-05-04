import { describe, test, expect } from 'vitest';

import { kebab } from '@domain/filters/kebab';

const HELLO_KEBAB = 'hello-world';

describe('kebab filter', () => {
  test('converts camelCase to kebab-case', () => {
    expect(kebab('helloWorld')).toBe(HELLO_KEBAB);
  });

  test('converts space-separated to kebab', () => {
    expect(kebab('Hello World')).toBe(HELLO_KEBAB);
  });

  test('converts snake_case to kebab', () => {
    expect(kebab('hello_world')).toBe(HELLO_KEBAB);
  });

  test('handles empty string', () => {
    expect(kebab('')).toBe('');
  });
});
