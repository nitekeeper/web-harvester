import { describe, test, expect } from 'vitest';

import { createFilterRegistry } from '@domain/filters/registry';

describe('createFilterRegistry', () => {
  test('register and apply a simple filter', () => {
    const reg = createFilterRegistry();
    reg.register('shout', (v: string) => v.toUpperCase());
    expect(reg.apply('shout', 'hello', [])).toBe('HELLO');
  });

  test('apply forwards positional args to the filter function', () => {
    const reg = createFilterRegistry();
    reg.register('wrap', (v: string, before: string, after: string) => `${before}${v}${after}`);
    expect(reg.apply('wrap', 'middle', ['<', '>'])).toBe('<middle>');
  });

  test('apply returns the value unchanged when filter is unknown', () => {
    const reg = createFilterRegistry();
    expect(reg.apply('does-not-exist', 'hello', ['x'])).toBe('hello');
  });

  test('get returns the registered function', () => {
    const reg = createFilterRegistry();
    const fn = (v: string): string => v + '!';
    reg.register('bang', fn);
    expect(reg.get('bang')).toBe(fn);
  });

  test('get returns undefined for an unknown filter', () => {
    const reg = createFilterRegistry();
    expect(reg.get('missing')).toBeUndefined();
  });

  test('register overwrites a previously registered filter', () => {
    const reg = createFilterRegistry();
    reg.register('x', () => 'first');
    reg.register('x', () => 'second');
    expect(reg.apply('x', 'ignored', [])).toBe('second');
  });
});
