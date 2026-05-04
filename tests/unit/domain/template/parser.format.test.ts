// tests/unit/domain/template/parser.format.test.ts
// Coverage tests for the AST formatters and parser-error formatter.

import { describe, test, expect } from 'vitest';

import {
  parse,
  formatAST,
  formatExpression,
  formatParserError,
  type Expression,
  type IfNode,
  type VariableNode,
} from '@domain/template/parser';

function variableExpression(input: string): Expression {
  const result = parse(input);
  return (result.ast[0] as VariableNode).expression;
}

describe('formatAST — node shapes', () => {
  test('formats text node', () => {
    expect(formatAST(parse('Hello').ast)).toContain('Text');
  });

  test('formats variable with identifier', () => {
    const out = formatAST(parse('{{title}}').ast);
    expect(out).toContain('Variable');
    expect(out).toContain('Identifier: title');
  });

  test('formats if/elseif/else block', () => {
    const out = formatAST(parse('{% if x %}A{% elseif y %}B{% else %}C{% endif %}').ast);
    expect(out).toContain('If');
    expect(out).toContain('ElseIf');
    expect(out).toContain('Else');
  });

  test('formats for loop', () => {
    const out = formatAST(parse('{% for x in xs %}{{x}}{% endfor %}').ast);
    expect(out).toContain('For');
    expect(out).toContain('Body');
  });

  test('formats set statement', () => {
    expect(formatAST(parse('{% set name = "Alice" %}').ast)).toContain('Set');
  });
});

describe('formatExpression — expression shapes', () => {
  test('formats binary expression', () => {
    const result = parse('{% if a == b %}y{% endif %}');
    const ifNode = result.ast.find((n): n is IfNode => n.type === 'if');
    expect(ifNode).toBeDefined();
    expect(formatExpression((ifNode as IfNode).condition, 0)).toContain('Binary');
  });

  test('formats unary expression', () => {
    const result = parse('{% if not x %}y{% endif %}');
    const ifNode = result.ast.find((n): n is IfNode => n.type === 'if');
    expect(ifNode).toBeDefined();
    expect(formatExpression((ifNode as IfNode).condition, 0)).toContain('Unary');
  });

  test('formats filter expression with args', () => {
    const out = formatExpression(variableExpression('{{x|split:","}}'), 0);
    expect(out).toContain('Filter');
    expect(out).toContain('Args');
  });

  test('formats filter expression with no args', () => {
    expect(formatExpression(variableExpression('{{x|trim}}'), 0)).toContain('Filter');
  });

  test('formats grouped expression', () => {
    expect(formatExpression(variableExpression('{{(a)}}'), 0)).toContain('Group');
  });

  test('formats member expression', () => {
    expect(formatExpression(variableExpression('{{items[0]}}'), 0)).toContain('Member');
  });

  test('formats literal expression', () => {
    expect(formatExpression(variableExpression('{{42}}'), 0)).toContain('Literal');
  });
});

describe('formatParserError', () => {
  test('formats error with line and column', () => {
    const formatted = formatParserError({ message: 'Boom', line: 4, column: 7 });
    expect(formatted).toBe('Error at line 4, column 7: Boom');
  });
});
