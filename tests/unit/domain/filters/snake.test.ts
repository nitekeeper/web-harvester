import { describe, test, expect } from 'vitest';

import { snake } from '@domain/filters/snake';

describe('snake filter', () => {
  test('converts camelCase to snake_case', () => {
    expect(snake('helloWorld')).toBe('hello_world');
  });

  test('converts space-separated to snake', () => {
    expect(snake('Hello World')).toBe('hello_world');
  });

  test('converts kebab to snake', () => {
    expect(snake('hello-world')).toBe('hello_world');
  });

  test('handles empty string', () => {
    expect(snake('')).toBe('');
  });
});
