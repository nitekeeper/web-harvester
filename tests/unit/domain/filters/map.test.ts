import { describe, test, expect } from 'vitest';

import { map } from '@domain/filters/map';

describe('map filter', () => {
  test('extracts a property from each object in array', () => {
    expect(map('[{"name":"a"},{"name":"b"}]', 'x => x.name')).toBe('["a","b"]');
  });

  test('returns input unchanged when no param given', () => {
    expect(map('["a","b"]')).toBe('["a","b"]');
  });

  test('returns input unchanged for invalid arrow function', () => {
    expect(map('["a","b"]', 'no arrow here')).toBe('["a","b"]');
  });

  test('renders a string template literal expression', () => {
    expect(map('["a","b"]', 'x => "${x}!"')).toBe('["a!","b!"]');
  });

  test('builds an object literal mapping', () => {
    const out = map('[{"name":"a","age":1}]', 'x => ({label: x.name})');
    expect(out).toBe('[{"label":"a"}]');
  });

  test('returns input unchanged when value is JSON null', () => {
    // JSON null is a valid parse result, not a parse failure — must not be
    // treated as an array and mapped.
    expect(map('null', 'x => x')).toBe('null');
  });
});
