// tests/unit/domain/template/tokenizer.test.ts
import { describe, test, expect } from 'vitest';

import {
  tokenize,
  formatToken,
  formatError,
  type Token,
  type TokenizerResult,
} from '@domain/template/tokenizer';

describe('tokenize — plain text', () => {
  test('tokenizes a plain string with no tags', () => {
    const result: TokenizerResult = tokenize('Hello, world!');
    expect(result.errors).toHaveLength(0);
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0]).toMatchObject({ type: 'text', value: 'Hello, world!' });
    expect(result.tokens[1]).toMatchObject({ type: 'eof' });
  });

  test('tokenizes empty string to eof only', () => {
    const result = tokenize('');
    expect(result.errors).toHaveLength(0);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]?.type).toBe('eof');
  });
});

describe('tokenize — variable tags', () => {
  test('tokenizes {{ variable }}', () => {
    const result = tokenize('{{title}}');
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toEqual(['variable_start', 'identifier', 'variable_end', 'eof']);
    expect(result.tokens[1]?.value).toBe('title');
  });

  test('tokenizes variable with pipe filter', () => {
    const result = tokenize('{{title|lower}}');
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toEqual([
      'variable_start',
      'identifier',
      'pipe',
      'identifier',
      'variable_end',
      'eof',
    ]);
  });

  test('tokenizes variable with two filters', () => {
    const result = tokenize('{{title|lower|trim}}');
    expect(result.errors).toHaveLength(0);
    const identifiers = result.tokens.filter((t) => t.type === 'identifier').map((t) => t.value);
    expect(identifiers).toEqual(['title', 'lower', 'trim']);
  });

  test('tracks line and column for variable_start', () => {
    const result = tokenize('Hello {{title}}');
    const start = result.tokens.find((t) => t.type === 'variable_start');
    expect(start).toBeDefined();
    expect(start?.line).toBe(1);
  });
});

describe('tokenize — tag tokens', () => {
  test('tokenizes {% if condition %}', () => {
    const result = tokenize('{% if x %}');
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('tag_start');
    expect(types).toContain('keyword_if');
    expect(types).toContain('identifier');
    expect(types).toContain('tag_end');
  });

  test('tokenizes {% for item in list %}', () => {
    const result = tokenize('{% for item in list %}');
    expect(result.errors).toHaveLength(0);
    const types = result.tokens.map((t) => t.type);
    expect(types).toContain('keyword_for');
    expect(types).toContain('keyword_in');
  });

  test('recognizes endif and endfor keywords', () => {
    const endifResult = tokenize('{% endif %}');
    const endforResult = tokenize('{% endfor %}');
    expect(endifResult.tokens.some((t) => t.type === 'keyword_endif')).toBe(true);
    expect(endforResult.tokens.some((t) => t.type === 'keyword_endfor')).toBe(true);
  });
});

describe('tokenize — string literals', () => {
  test('tokenizes double-quoted string', () => {
    const result = tokenize('{{"hello world"}}');
    const str = result.tokens.find((t) => t.type === 'string');
    expect(str).toBeDefined();
    expect(str?.value).toBe('hello world');
  });

  test('tokenizes single-quoted string', () => {
    const result = tokenize("{{'hello'}}");
    const str = result.tokens.find((t) => t.type === 'string');
    expect(str?.value).toBe('hello');
  });

  test('handles escape sequences inside strings', () => {
    const result = tokenize('{{"line1\\nline2"}}');
    const str = result.tokens.find((t) => t.type === 'string');
    expect(str?.value).toBe('line1\nline2');
  });
});

describe('tokenize — number literals', () => {
  test('tokenizes integers', () => {
    const result = tokenize('{{42}}');
    const num = result.tokens.find((t) => t.type === 'number');
    expect(num?.value).toBe('42');
  });

  test('tokenizes floats', () => {
    const result = tokenize('{{3.14}}');
    const num = result.tokens.find((t) => t.type === 'number');
    expect(num?.value).toBe('3.14');
  });

  test('tokenizes negative numbers', () => {
    const result = tokenize('{{-5}}');
    const num = result.tokens.find((t) => t.type === 'number');
    expect(num?.value).toBe('-5');
  });
});

describe('tokenize — operators', () => {
  test('tokenizes == operator', () => {
    const result = tokenize('{% if x == y %}');
    expect(result.tokens.some((t) => t.type === 'op_eq')).toBe(true);
  });

  test('tokenizes != operator', () => {
    const result = tokenize('{% if x != y %}');
    expect(result.tokens.some((t) => t.type === 'op_neq')).toBe(true);
  });

  test('tokenizes and / or keywords', () => {
    const result = tokenize('{% if x and y %}');
    expect(result.tokens.some((t) => t.type === 'op_and')).toBe(true);
  });

  test('tokenizes ?? operator', () => {
    const result = tokenize('{{x ?? y}}');
    expect(result.tokens.some((t) => t.type === 'op_nullish')).toBe(true);
  });
});

describe('tokenize — boolean and null literals', () => {
  test('tokenizes true', () => {
    const result = tokenize('{{true}}');
    expect(result.tokens.some((t) => t.type === 'boolean' && t.value === 'true')).toBe(true);
  });

  test('tokenizes false', () => {
    const result = tokenize('{{false}}');
    expect(result.tokens.some((t) => t.type === 'boolean' && t.value === 'false')).toBe(true);
  });

  test('tokenizes null', () => {
    const result = tokenize('{{null}}');
    expect(result.tokens.some((t) => t.type === 'null')).toBe(true);
  });
});

describe('tokenize — error recovery', () => {
  test('reports error for missing closing }}', () => {
    const result = tokenize('{{title');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports error for missing closing %}', () => {
    const result = tokenize('{% if x');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports error for malformed variable with single }', () => {
    const result = tokenize('{{title}');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('tokenize — multiline templates', () => {
  test('tracks line numbers across newlines', () => {
    const result = tokenize('line1\n{{title}}\nline3');
    const varStart = result.tokens.find((t) => t.type === 'variable_start');
    expect(varStart?.line).toBe(2);
  });
});

describe('tokenize — mixed content', () => {
  test('tokenizes text before and after variable', () => {
    const result = tokenize('Hello {{name}}!');
    const types = result.tokens.map((t) => t.type);
    expect(types[0]).toBe('text');
    expect(types[1]).toBe('variable_start');
    // tokens: [text, variable_start, identifier, variable_end, text, eof]
    expect(types[types.length - 3]).toBe('variable_end');
    expect(types[types.length - 2]).toBe('text');
    expect(types[types.length - 1]).toBe('eof');
  });
});

describe('formatToken', () => {
  test('formats token with value', () => {
    const token: Token = { type: 'identifier', value: 'title', line: 1, column: 3 };
    expect(formatToken(token)).toBe('identifier("title") at 1:3');
  });

  test('formats token without value', () => {
    const token: Token = { type: 'eof', value: '', line: 2, column: 1 };
    expect(formatToken(token)).toBe('eof at 2:1');
  });
});

describe('formatError', () => {
  test('formats error with position', () => {
    const error = { message: 'Unexpected char', line: 3, column: 5 };
    expect(formatError(error)).toBe('Error at line 3, column 5: Unexpected char');
  });
});
