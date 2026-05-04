import { describe, test, expect } from 'vitest';

import { pascal } from '@domain/filters/pascal';

describe('pascal filter', () => {
  test('converts space-separated to PascalCase', () => {
    expect(pascal('hello world')).toBe('HelloWorld');
  });

  test('converts kebab to PascalCase', () => {
    expect(pascal('hello-world')).toBe('HelloWorld');
  });

  test('converts snake to PascalCase', () => {
    expect(pascal('hello_world')).toBe('HelloWorld');
  });

  test('uppercases the first character', () => {
    expect(pascal('hello')).toBe('Hello');
  });
});
