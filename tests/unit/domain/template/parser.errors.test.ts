// tests/unit/domain/template/parser.errors.test.ts
// Coverage tests for parser error-recovery paths — variable, tag, if/for/set
// statement errors. Split out from parser.coverage.test.ts to keep each file
// under the 400-line ceiling.

import { describe, test, expect } from 'vitest';

import { parse, parseTokens, type VariableNode } from '@domain/template/parser';
import { tokenize } from '@domain/template/tokenizer';

const containsUnexpected = (msg: string): boolean => msg.includes('Unexpected');
const containsVariableName = (msg: string): boolean => msg.includes('variable name');

describe('parse — variable error paths', () => {
  test('reports empty variable {{}}', () => {
    const result = parse('{{}}');
    expect(result.errors.some((e) => e.message.includes('Empty variable'))).toBe(true);
  });

  test('reports unknown variable for unquoted prompt', () => {
    const result = parse('{{a summary of the page}}');
    expect(result.errors.some((e) => e.message.includes('wrap it in quotes'))).toBe(true);
  });

  test('reports missing closing }} when followed by another variable', () => {
    const result = parse('{{title{{x}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('parses a variable with trim markers', () => {
    const result = parse('{{title}}');
    expect(result.errors).toHaveLength(0);
    const node = result.ast[0] as VariableNode;
    expect(node.trimLeft).toBe(false);
    expect(node.trimRight).toBe(false);
  });
});

describe('parse — tag dispatch errors (else/elseif/endif)', () => {
  test('reports unexpected {% else %} without if', () => {
    const result = parse('{% else %}');
    expect(result.errors.some((e) => containsUnexpected(e.message))).toBe(true);
  });

  test('reports unexpected {% elseif %} without if', () => {
    const result = parse('{% elseif x %}');
    expect(result.errors.some((e) => containsUnexpected(e.message))).toBe(true);
  });

  test('reports unexpected {% endif %} without if', () => {
    const result = parse('{% endif %}');
    expect(result.errors.some((e) => containsUnexpected(e.message))).toBe(true);
  });
});

describe('parse — tag dispatch errors (unknown / stray)', () => {
  test('reports unknown tag', () => {
    const result = parse('{% wibble %}');
    expect(result.errors.some((e) => e.message.includes('Unknown tag'))).toBe(true);
  });

  test('reports invalid first token in template', () => {
    const tokens = tokenize('{{title}}').tokens.slice();
    // Replace first token with a stray identifier so parseNode hits the default branch
    tokens[0] = { type: 'identifier', value: 'stray', line: 1, column: 1 };
    const result = parseTokens(tokens);
    expect(result.errors.some((e) => containsUnexpected(e.message))).toBe(true);
  });
});

describe('parse — if statement error paths', () => {
  test('reports {% if %} without condition', () => {
    const result = parse('{% if %}body{% endif %}');
    expect(result.errors.some((e) => e.message.includes('requires a condition'))).toBe(true);
  });

  test('reports if missing tag close', () => {
    const result = parse('{% if x body{% endif %}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports {% elseif %} without condition', () => {
    const result = parse('{% if x %}A{% elseif %}B{% endif %}');
    expect(result.errors.some((e) => e.message.includes('elseif'))).toBe(true);
  });

  test('reports missing endif', () => {
    const result = parse('{% if x %}body');
    expect(result.errors.some((e) => e.message.includes('endif'))).toBe(true);
  });
});

describe('parse — for statement error paths', () => {
  test('reports {% for %} without iterator name', () => {
    const result = parse('{% for in items %}{% endfor %}');
    expect(result.errors.some((e) => containsVariableName(e.message))).toBe(true);
  });

  test('reports {% for %} without "in" keyword', () => {
    const result = parse('{% for item items %}{% endfor %}');
    expect(result.errors.some((e) => e.message.includes('"in"'))).toBe(true);
  });

  test('reports {% for %} without iterable expression', () => {
    const result = parse('{% for item in %}{% endfor %}');
    expect(result.errors.some((e) => e.message.includes('loop over'))).toBe(true);
  });

  test('reports missing endfor', () => {
    const result = parse('{% for x in xs %}body');
    expect(result.errors.some((e) => e.message.includes('endfor'))).toBe(true);
  });

  test('reports missing %} on for', () => {
    const result = parse('{% for x in xs body{% endfor %}');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('parse — set statement error paths', () => {
  test('reports {% set %} without variable name', () => {
    const result = parse('{% set = "x" %}');
    expect(result.errors.some((e) => containsVariableName(e.message))).toBe(true);
  });

  test('reports {% set %} without =', () => {
    const result = parse('{% set name "x" %}');
    expect(result.errors.some((e) => e.message.includes('"="'))).toBe(true);
  });

  test('reports {% set %} without value', () => {
    const result = parse('{% set name = %}');
    expect(result.errors.some((e) => e.message.includes('value after "="'))).toBe(true);
  });

  test('reports missing %} on set', () => {
    const result = parse('{% set name = "x"');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('parse — extra error-recovery branches', () => {
  test('reports missing %} when if condition is followed by stray identifier', () => {
    const result = parse('{% if x foo %}body{% endif %}');
    expect(result.errors.some((e) => e.message.includes('Missing %}'))).toBe(true);
  });

  test('reports missing closing %} after else keyword', () => {
    const result = parse('{% if x %}A{% else stray %}B{% endif %}');
    expect(result.errors.some((e) => e.message.includes('Missing closing %}'))).toBe(true);
  });

  test('reports missing closing %} after endif keyword', () => {
    const result = parse('{% if x %}A{% endif stray %}');
    expect(result.errors.some((e) => e.message.includes('Missing closing %}'))).toBe(true);
  });
});

describe('parseTokens fallback to EOF token', () => {
  test('handles empty token array gracefully', () => {
    const result = parseTokens([]);
    expect(result.ast).toHaveLength(0);
  });
});
