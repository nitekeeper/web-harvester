// tests/unit/domain/template/parser.test.ts
import { describe, test, expect } from 'vitest';

import {
  parse,
  parseTokens,
  type ASTNode,
  type TextNode,
  type VariableNode,
  type IfNode,
  type ForNode,
  type SetNode,
  type Expression,
  type LiteralExpression,
  type IdentifierExpression,
  type BinaryExpression,
  type UnaryExpression,
  type FilterExpression,
} from '@domain/template/parser';

// Type guards
const isText = (n: ASTNode): n is TextNode => n.type === 'text';
const isVariable = (n: ASTNode): n is VariableNode => n.type === 'variable';
const isIf = (n: ASTNode): n is IfNode => n.type === 'if';
const isFor = (n: ASTNode): n is ForNode => n.type === 'for';
const isSet = (n: ASTNode): n is SetNode => n.type === 'set';
const isLiteral = (e: Expression): e is LiteralExpression => e.type === 'literal';
const isIdentifier = (e: Expression): e is IdentifierExpression => e.type === 'identifier';
const isBinary = (e: Expression): e is BinaryExpression => e.type === 'binary';
const isUnary = (e: Expression): e is UnaryExpression => e.type === 'unary';
const isFilter = (e: Expression): e is FilterExpression => e.type === 'filter';

function firstNode(input: string): ASTNode {
  const result = parse(input);
  expect(result.errors).toHaveLength(0);
  const node = result.ast[0];
  expect(node).toBeDefined();
  return node as ASTNode;
}

describe('parse — text content', () => {
  test('parses plain text', () => {
    const result = parse('Hello, world!');
    expect(result.errors).toHaveLength(0);
    expect(result.ast).toHaveLength(1);
    const node = result.ast[0];
    expect(node && isText(node)).toBe(true);
    expect((node as TextNode).value).toBe('Hello, world!');
  });

  test('parses empty string', () => {
    const result = parse('');
    expect(result.errors).toHaveLength(0);
    expect(result.ast).toHaveLength(0);
  });
});

describe('parse — variables: simple and filtered', () => {
  test('parses simple variable', () => {
    const node = firstNode('{{title}}') as VariableNode;
    expect(isVariable(node)).toBe(true);
    expect(isIdentifier(node.expression)).toBe(true);
    expect((node.expression as IdentifierExpression).name).toBe('title');
  });

  test('parses variable with filter', () => {
    const node = firstNode('{{title|lower}}') as VariableNode;
    expect(isFilter(node.expression)).toBe(true);
    const filterExpr = node.expression as FilterExpression;
    expect(filterExpr.name).toBe('lower');
    expect(isIdentifier(filterExpr.value)).toBe(true);
  });

  test('parses variable with chained filters', () => {
    const node = firstNode('{{title|lower|trim}}') as VariableNode;
    expect(isFilter(node.expression)).toBe(true);
    const outer = node.expression as FilterExpression;
    expect(outer.name).toBe('trim');
    expect(isFilter(outer.value)).toBe(true);
    expect((outer.value as FilterExpression).name).toBe('lower');
  });

  test('parses variable with filter arguments', () => {
    const node = firstNode('{{date|date:"YYYY-MM-DD"}}') as VariableNode;
    const filterExpr = node.expression as FilterExpression;
    expect(filterExpr.name).toBe('date');
    expect(filterExpr.args).toHaveLength(1);
    const arg = filterExpr.args[0];
    expect(arg && isLiteral(arg)).toBe(true);
    expect((arg as LiteralExpression).value).toBe('YYYY-MM-DD');
  });
});

describe('parse — variables: literals and operators', () => {
  test('parses nullish coalescing', () => {
    const node = firstNode('{{author ?? "Unknown"}}') as VariableNode;
    expect(isBinary(node.expression)).toBe(true);
    expect((node.expression as BinaryExpression).operator).toBe('??');
  });

  test('parses string literal variable', () => {
    const node = firstNode('{{"static text"}}') as VariableNode;
    expect(isLiteral(node.expression)).toBe(true);
    expect((node.expression as LiteralExpression).value).toBe('static text');
  });
});

describe('parse — if statements', () => {
  test('parses basic if/endif', () => {
    const result = parse('{% if title %}{{title}}{% endif %}');
    expect(result.errors).toHaveLength(0);
    const ifNode = result.ast.find(isIf);
    expect(ifNode).toBeDefined();
    expect(ifNode?.consequent).toHaveLength(1);
    expect(ifNode?.alternate).toBeNull();
  });

  test('parses if/else/endif', () => {
    const result = parse('{% if x %}A{% else %}B{% endif %}');
    expect(result.errors).toHaveLength(0);
    const ifNode = result.ast.find(isIf);
    expect(ifNode?.alternate).not.toBeNull();
  });

  test('parses if/elseif/else/endif', () => {
    const result = parse('{% if x == 1 %}A{% elseif x == 2 %}B{% else %}C{% endif %}');
    expect(result.errors).toHaveLength(0);
    const ifNode = result.ast.find(isIf);
    expect(ifNode?.elseifs).toHaveLength(1);
    expect(ifNode?.alternate).not.toBeNull();
  });

  test('parses if with binary condition', () => {
    const result = parse('{% if x == "hello" %}yes{% endif %}');
    expect(result.errors).toHaveLength(0);
    const ifNode = result.ast.find(isIf);
    expect(ifNode && isBinary(ifNode.condition)).toBe(true);
    expect((ifNode?.condition as BinaryExpression).operator).toBe('==');
  });

  test('parses if with not operator', () => {
    const result = parse('{% if not x %}y{% endif %}');
    expect(result.errors).toHaveLength(0);
    const ifNode = result.ast.find(isIf);
    expect(ifNode && isUnary(ifNode.condition)).toBe(true);
  });
});

describe('parse — for loops', () => {
  test('parses basic for loop', () => {
    const result = parse('{% for tag in tags %}{{tag}}{% endfor %}');
    expect(result.errors).toHaveLength(0);
    const forNode = result.ast.find(isFor);
    expect(forNode?.iterator).toBe('tag');
    expect(forNode && isIdentifier(forNode.iterable)).toBe(true);
    expect((forNode?.iterable as IdentifierExpression).name).toBe('tags');
    expect(forNode?.body).toHaveLength(1);
  });
});

describe('parse — set statements', () => {
  test('parses set statement', () => {
    const result = parse('{% set name = "Alice" %}');
    expect(result.errors).toHaveLength(0);
    const setNode = result.ast.find(isSet);
    expect(setNode?.variable).toBe('name');
    expect(setNode && isLiteral(setNode.value)).toBe(true);
    expect((setNode?.value as LiteralExpression).value).toBe('Alice');
  });
});

describe('parse — mixed content', () => {
  test('parses text, variable, and text', () => {
    const result = parse('Hello, {{name}}!');
    expect(result.errors).toHaveLength(0);
    expect(result.ast).toHaveLength(3);
    const [a, b, c] = result.ast;
    expect(a && isText(a)).toBe(true);
    expect(b && isVariable(b)).toBe(true);
    expect(c && isText(c)).toBe(true);
  });
});

describe('parse — error handling', () => {
  test('returns errors for unclosed variable', () => {
    const result = parse('{{title');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('returns errors for unclosed if', () => {
    const result = parse('{% if x %}body');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('returns errors for unexpected endfor without for', () => {
    const result = parse('{% endfor %}');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('parseTokens', () => {
  test('parses pre-tokenized token stream', async () => {
    const { tokenize } = await import('@domain/template/tokenizer');
    const { tokens } = tokenize('{{title}}');
    const result = parseTokens(tokens);
    expect(result.errors).toHaveLength(0);
    expect(result.ast).toHaveLength(1);
  });
});
