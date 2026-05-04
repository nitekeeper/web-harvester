import { describe, test, expect } from 'vitest';

import { camel } from '@domain/filters/camel';

describe('camel filter', () => {
  test('converts space-separated words', () => {
    expect(camel('hello world')).toBe('helloWorld');
  });

  test('converts hyphenated words', () => {
    expect(camel('hello-world-now')).toBe('helloWorldNow');
  });

  test('strips underscores in snake_case words (no recapitalization)', () => {
    // Known limitation: \b doesn't fire after `_` so snake_case loses the
    // separator without uppercasing the next letter — matches source behavior.
    expect(camel('hello_world')).toBe('helloworld');
  });

  test('lowercases the first character', () => {
    expect(camel('HelloWorld')).toBe('helloWorld');
  });
});
