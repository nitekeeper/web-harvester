// tests/unit/domain/template/parser.validate.test.ts
// Coverage tests for variable-reference validation and Levenshtein distance.

import { describe, test, expect } from 'vitest';

import {
  parse,
  validateVariables,
  levenshteinDistance,
  type ForNode,
  type SetNode,
} from '@domain/template/parser';

describe('parse — for loop with extra coverage', () => {
  test('iterates with for_index implicit binding', () => {
    const result = parse('{% for tag in highlights %}{{tag_index}}{{tag}}{% endfor %}');
    expect(result.errors).toHaveLength(0);
    const forNode = result.ast.find((n): n is ForNode => n.type === 'for');
    expect(forNode?.body.length).toBe(2);
  });
});

describe('parse — set with binary expression value', () => {
  test('parses set with computed value', () => {
    const result = parse('{% set total = "Alice" %}');
    expect(result.errors).toHaveLength(0);
    const setNode = result.ast.find((n): n is SetNode => n.type === 'set');
    expect(setNode?.variable).toBe('total');
  });
});

describe('levenshteinDistance', () => {
  test('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  test('returns length for completely different strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  test('returns 1 for one substitution', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
  });

  test('handles insertion', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
  });

  test('handles deletion', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
  });
});

describe('validateVariables — preset and defined', () => {
  test('returns no warnings for preset variable', () => {
    expect(validateVariables(parse('{{title}}').ast)).toHaveLength(0);
  });

  test('warns for unknown variable', () => {
    const warnings = validateVariables(parse('{{unknownvar}}').ast);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]?.message).toContain('Unknown variable');
  });

  test('suggests preset name for similar typo', () => {
    const warnings = validateVariables(parse('{{titel}}').ast);
    expect(warnings[0]?.message).toContain('Did you mean');
  });

  test('accepts {% set %}-defined variable', () => {
    expect(validateVariables(parse('{% set custom = "x" %}{{custom}}').ast)).toHaveLength(0);
  });
});

describe('validateVariables — loop and prefix scopes', () => {
  test('accepts loop iterator variable inside for body', () => {
    const result = parse('{% for tag in highlights %}{{tag}}{% endfor %}');
    expect(validateVariables(result.ast)).toHaveLength(0);
  });

  test('accepts loop_index sibling variable inside for body', () => {
    const result = parse('{% for tag in highlights %}{{tag_index}}{% endfor %}');
    expect(validateVariables(result.ast)).toHaveLength(0);
  });

  test('accepts schema: prefix variables', () => {
    expect(validateVariables(parse('{{schema:author}}').ast)).toHaveLength(0);
  });

  test('accepts selector: prefix variables', () => {
    expect(validateVariables(parse('{{selector:h1}}').ast)).toHaveLength(0);
  });

  test('accepts dotted property access on preset', () => {
    expect(validateVariables(parse('{{title.length}}').ast)).toHaveLength(0);
  });

  test('accepts loop.index reference', () => {
    const result = parse('{% for tag in highlights %}{{loop.index}}{% endfor %}');
    expect(validateVariables(result.ast)).toHaveLength(0);
  });
});

describe('validateVariables — collectVariables traversal', () => {
  test('accepts variables inside if condition', () => {
    expect(validateVariables(parse('{% if title %}yes{% endif %}').ast)).toHaveLength(0);
  });

  test('accepts variables inside elseif and else branches', () => {
    const result = parse(
      '{% if title %}{{title}}{% elseif author %}{{author}}{% else %}{{url}}{% endif %}',
    );
    expect(validateVariables(result.ast)).toHaveLength(0);
  });

  test('accepts variables inside set value with filter', () => {
    expect(validateVariables(parse('{% set x = title|lower %}{{x}}').ast)).toHaveLength(0);
  });

  test('accepts member access with bracket notation', () => {
    expect(validateVariables(parse('{{title[0]}}').ast)).toHaveLength(0);
  });

  test('accepts unary not expression', () => {
    expect(validateVariables(parse('{% if not title %}y{% endif %}').ast)).toHaveLength(0);
  });

  test('accepts grouped expression', () => {
    expect(validateVariables(parse('{% if (title) %}y{% endif %}').ast)).toHaveLength(0);
  });

  test('accepts nullish coalescing left side', () => {
    expect(validateVariables(parse('{{title ?? "fallback"}}').ast)).toHaveLength(0);
  });
});

describe('validateVariables — getVariableNameFromExpression branches', () => {
  test('walks through filter expression to find base identifier', () => {
    expect(validateVariables(parse('{{title|lower}}').ast)).toHaveLength(0);
  });

  test('walks through member expression to find base identifier', () => {
    expect(validateVariables(parse('{{title[0]}}').ast)).toHaveLength(0);
  });

  test('returns null for variable wrapping a non-?? binary expression', () => {
    // Variable expression is binary with ==; getVariableNameFromExpression
    // returns null so no scoped reference is added — but the embedded
    // identifiers are still collected via collectExpression.
    expect(validateVariables(parse('{{title == author}}').ast)).toHaveLength(0);
  });

  test('handles variable wrapping a literal expression', () => {
    expect(validateVariables(parse('{{42}}').ast)).toHaveLength(0);
  });

  test('handles variable wrapping a unary expression', () => {
    expect(validateVariables(parse('{{not title}}').ast)).toHaveLength(0);
  });

  test('handles variable wrapping a grouped expression', () => {
    expect(validateVariables(parse('{{(title)}}').ast)).toHaveLength(0);
  });

  test('walks filter args during validation', () => {
    // Filter arg is a quoted string literal — collectExpression iterates the
    // args list, so this exercises the "for arg of expr.args" branch.
    expect(validateVariables(parse('{{title|date:"YYYY-MM-DD"}}').ast)).toHaveLength(0);
  });
});
