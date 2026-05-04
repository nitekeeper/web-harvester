import { describe, test, expect } from 'vitest';

import { uncamel } from '@domain/filters/uncamel';

describe('uncamel filter', () => {
  test('splits camelCase with spaces and lowercases', () => {
    expect(uncamel('helloWorld')).toBe('hello world');
  });

  test('splits PascalCase with spaces and lowercases', () => {
    expect(uncamel('HelloWorld')).toBe('hello world');
  });

  test('handles consecutive uppercase letters followed by lowercase', () => {
    expect(uncamel('HTTPServer')).toBe('http server');
  });

  test('returns empty string for empty input', () => {
    expect(uncamel('')).toBe('');
  });
});
