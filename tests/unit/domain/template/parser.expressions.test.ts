// tests/unit/domain/template/parser.expressions.test.ts
// Coverage tests for the expression-parsing precedence chain — operators,
// primary expressions, member access, schema-prefix identifiers.

import { describe, test, expect } from 'vitest';

import {
  parse,
  type BinaryExpression,
  type IdentifierExpression,
  type IfNode,
  type LiteralExpression,
  type VariableNode,
} from '@domain/template/parser';
import { parsePrimaryExpression } from '@domain/template/parser-primary';
import type { ParserState } from '@domain/template/parser-state';

const MISSING_VALUE = 'Missing value';

describe('parse — boolean and nullish operators', () => {
  test('parses or expression', () => {
    const result = parse('{% if a or b %}y{% endif %}');
    expect(result.errors).toHaveLength(0);
    const ifNode = result.ast.find((n): n is IfNode => n.type === 'if');
    expect((ifNode?.condition as BinaryExpression).operator).toBe('or');
  });

  test('parses and expression', () => {
    const result = parse('{% if a and b %}y{% endif %}');
    expect(result.errors).toHaveLength(0);
    const ifNode = result.ast.find((n): n is IfNode => n.type === 'if');
    expect((ifNode?.condition as BinaryExpression).operator).toBe('and');
  });

  test('parses nested not expression', () => {
    const result = parse('{% if not not x %}y{% endif %}');
    expect(result.errors).toHaveLength(0);
  });

  test('parses each comparison operator', () => {
    for (const op of ['==', '!=', '>', '<', '>=', '<=']) {
      const result = parse(`{% if a ${op} b %}y{% endif %}`);
      expect(result.errors).toHaveLength(0);
    }
    const containsResult = parse('{% if list contains x %}y{% endif %}');
    expect(containsResult.errors).toHaveLength(0);
  });
});

describe('parse — operator error paths', () => {
  test('reports missing right operand for or', () => {
    const result = parse('{% if a or %}y{% endif %}');
    expect(result.errors.some((e) => e.message.includes(MISSING_VALUE))).toBe(true);
  });

  test('reports missing right operand for and', () => {
    const result = parse('{% if a and %}y{% endif %}');
    expect(result.errors.some((e) => e.message.includes(MISSING_VALUE))).toBe(true);
  });

  test('reports missing right operand for not', () => {
    const result = parse('{{not}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports missing right operand for comparison', () => {
    const result = parse('{% if a == %}y{% endif %}');
    expect(result.errors.some((e) => e.message.includes(MISSING_VALUE))).toBe(true);
  });

  test('reports missing fallback after ??', () => {
    const result = parse('{{x ??}}');
    expect(result.errors.some((e) => e.message.includes('after ??'))).toBe(true);
  });
});

describe('parse — primary literals', () => {
  test('parses number literal', () => {
    const result = parse('{{42}}');
    const node = result.ast[0] as VariableNode;
    expect((node.expression as LiteralExpression).value).toBe(42);
  });

  test('parses true literal', () => {
    const result = parse('{{true}}');
    const node = result.ast[0] as VariableNode;
    expect((node.expression as LiteralExpression).value).toBe(true);
  });

  test('parses false literal', () => {
    const result = parse('{{false}}');
    const node = result.ast[0] as VariableNode;
    expect((node.expression as LiteralExpression).value).toBe(false);
  });

  test('parses null literal', () => {
    const result = parse('{{null}}');
    const node = result.ast[0] as VariableNode;
    expect((node.expression as LiteralExpression).value).toBeNull();
  });
});

describe('parse — primary groups, brackets, prefixes', () => {
  test('parses grouped expression', () => {
    const result = parse('{{(a or b) and c}}');
    expect(result.errors).toHaveLength(0);
  });

  test('reports empty parentheses', () => {
    const result = parse('{{()}}');
    expect(result.errors.some((e) => e.message.includes('Empty parentheses'))).toBe(true);
  });

  test('reports missing closing )', () => {
    const result = parse('{{(a}}');
    expect(result.errors.some((e) => e.message.includes('Missing closing )'))).toBe(true);
  });

  test('parses bracket member access', () => {
    const result = parse('{{items[0]}}');
    expect(result.errors).toHaveLength(0);
  });

  test('reports empty brackets', () => {
    const result = parse('{{items[]}}');
    expect(result.errors.some((e) => e.message.includes('Empty brackets'))).toBe(true);
  });

  test('reports missing closing ]', () => {
    const result = parse('{{items[0}}');
    expect(result.errors.some((e) => e.message.includes('Missing closing ]'))).toBe(true);
  });

  test('parses identifier with schema prefix', () => {
    const result = parse('{{schema:director[*].name}}');
    expect(result.errors).toHaveLength(0);
    const node = result.ast[0] as VariableNode;
    const idExpr = node.expression as IdentifierExpression;
    expect(idExpr.name.startsWith('schema:')).toBe(true);
  });
});

describe('parsePrimaryExpression — internal null guard', () => {
  test('returns null for lparen when state has no parseExpr', () => {
    const state: ParserState = {
      tokens: [
        { type: 'lparen', value: '(', line: 1, column: 1 },
        { type: 'eof', value: '', line: 1, column: 2 },
      ],
      pos: 0,
      errors: [],
    };
    const result = parsePrimaryExpression(state);
    expect(result).toBeNull();
    expect(state.pos).toBe(0);
  });
});
