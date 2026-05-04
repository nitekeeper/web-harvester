import { describe, test, expect } from 'vitest';

import { list } from '@domain/filters/list';

describe('list filter', () => {
  test('formats JSON array as bullet list by default', () => {
    expect(list('["a","b"]')).toBe('- a\n- b');
  });

  test('formats as numbered list', () => {
    expect(list('["a","b"]', 'numbered')).toBe('1. a\n2. b');
  });

  test('formats as task list', () => {
    expect(list('["a","b"]', 'task')).toBe('- [ ] a\n- [ ] b');
  });

  test('formats as numbered task list', () => {
    expect(list('["a","b"]', 'numbered-task')).toBe('1. [ ] a\n2. [ ] b');
  });

  test('returns empty input unchanged', () => {
    expect(list('')).toBe('');
  });

  test('handles nested arrays with indentation', () => {
    expect(list('["a",["b"]]')).toBe('- a\n\t- b');
  });
});
