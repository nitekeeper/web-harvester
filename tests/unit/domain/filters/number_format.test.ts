import { describe, test, expect } from 'vitest';

import { number_format } from '@domain/filters/number_format';

describe('number_format filter', () => {
  test('formats integer with default thousands separator', () => {
    expect(number_format('1234567')).toBe('1,234,567');
  });

  test('formats with decimals', () => {
    expect(number_format('1234.567', '2')).toBe('1,234.57');
  });

  test('uses custom decimal point and thousands separator', () => {
    expect(number_format('1234567.89', '2,",","."')).toBe('1.234.567,89');
  });

  test('returns input unchanged for non-numeric input', () => {
    expect(number_format('hello')).toBe('hello');
  });
});
