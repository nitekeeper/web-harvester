import { describe, test, expect } from 'vitest';

import { safe_name } from '@domain/filters/safe_name';

describe('safe_name filter', () => {
  test('strips special characters across all OS modes', () => {
    expect(safe_name('hello#world')).toBe('helloworld');
  });

  test('strips Windows-illegal characters in windows mode', () => {
    expect(safe_name('a<b>c:d', 'windows')).toBe('abcd');
  });

  test('escapes Windows reserved names with leading underscore', () => {
    expect(safe_name('CON.txt', 'windows')).toBe('_CON.txt');
  });

  test('strips colon and slash in mac mode', () => {
    expect(safe_name('a/b:c', 'mac')).toBe('abc');
  });

  test('escapes leading dot to underscore on mac', () => {
    expect(safe_name('.hidden', 'mac')).toBe('_hidden');
  });

  test('strips slashes in linux mode', () => {
    expect(safe_name('a/b/c', 'linux')).toBe('abc');
  });

  test('uses the conservative defaults when no os param is given', () => {
    expect(safe_name('a:b/c<d')).toBe('abcd');
  });

  test('returns Untitled for empty result', () => {
    expect(safe_name('###')).toBe('Untitled');
  });

  test('truncates to 245 characters', () => {
    const huge = 'a'.repeat(500);
    expect(safe_name(huge).length).toBe(245);
  });

  test('replaces leading dot with underscore (default mode)', () => {
    // default mode swaps the first leading `.` for `_`; the common
    // `^\.+` strip then has nothing left to remove because the first
    // character is now an underscore.
    expect(safe_name('...hidden')).toBe('_..hidden');
  });

  test('windows mode strips trailing dots and removes special chars', () => {
    expect(safe_name('hello.', 'windows')).toBe('hello');
  });
});
