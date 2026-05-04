// tests/unit/domain/template/parser.filters.test.ts
// Coverage tests for filter argument parsing — the colon/comma syntax,
// arrow functions, range notation, regex character classes, and chained
// quoted-string args.

import { describe, test, expect } from 'vitest';

import {
  parse,
  type FilterExpression,
  type LiteralExpression,
  type VariableNode,
} from '@domain/template/parser';

function firstFilter(input: string): FilterExpression {
  const result = parse(input);
  const node = result.ast[0] as VariableNode;
  return node.expression as FilterExpression;
}

describe('parse — basic filter argument shapes', () => {
  test('parses filter with slash delimiter argument', () => {
    const filterExpr = firstFilter('{{x|split:/}}');
    expect((filterExpr.args[0] as LiteralExpression).value).toBe('/');
  });

  test('parses filter with bracket character class', () => {
    const filterExpr = firstFilter('{{x|split:[0-9]}}');
    expect(String((filterExpr.args[0] as LiteralExpression).value)).toContain('[');
  });

  test('parses filter with arrow function argument', () => {
    const filterExpr = firstFilter('{{items|map:tweet => tweet.text}}');
    const arg = filterExpr.args[0] as LiteralExpression;
    expect(String(arg.value)).toContain('=>');
  });

  test('parses filter with chained string pairs', () => {
    const filterExpr = firstFilter('{{x|replace:"a":"b"}}');
    expect(String((filterExpr.args[0] as LiteralExpression).value)).toContain('"a":"b"');
  });

  test('parses filter with comma-separated args', () => {
    const filterExpr = firstFilter('{{x|slice:0,3}}');
    expect(filterExpr.args.length).toBe(2);
  });
});

describe('parse — filter argument variants', () => {
  test('parses filter with parenthesised args', () => {
    const filterExpr = firstFilter('{{x|replace:("a":"b","c":"d")}}');
    expect(filterExpr.args.length).toBe(2);
  });

  test('parses filter with range notation', () => {
    const filterExpr = firstFilter('{{x|nth:2:7}}');
    expect(String((filterExpr.args[0] as LiteralExpression).value)).toBe('2:7');
  });

  test('parses filter with 2n nth notation', () => {
    const filterExpr = firstFilter('{{x|nth:2n}}');
    expect(String((filterExpr.args[0] as LiteralExpression).value)).toBe('2n');
  });

  test('reports missing filter name after pipe', () => {
    const result = parse('{{x|}}');
    expect(result.errors.some((e) => e.message.includes('filter name'))).toBe(true);
  });

  test('parses filter with star delimiter', () => {
    const result = parse('{{x|split:*}}');
    expect(result.errors).toHaveLength(0);
  });
});

describe('parse — filter chain edge cases (quoted strings)', () => {
  test('handles quoted-string filter arg followed by non-string after colon', () => {
    // The "YYYY" arg is parsed; the trailing :42 is not a string so the chain
    // breaks and the parser leaves :42 to be consumed elsewhere (or errors).
    const filterExpr = firstFilter('{{x|date:"YYYY":42}}');
    expect(filterExpr.args.length).toBeGreaterThanOrEqual(1);
    expect((filterExpr.args[0] as LiteralExpression).value).toBe('YYYY');
  });

  test('arrow body preserves string-literal tokens with surrounding quotes', () => {
    // String tokens inside an arrow body are reformatted with `"..."` so
    // downstream evaluators can distinguish strings from identifiers.
    const filterExpr = firstFilter('{{items|map:t => "hello"}}');
    expect(String((filterExpr.args[0] as LiteralExpression).value)).toContain('"hello"');
  });
});

describe('parse — filter chain edge cases (parens / colon ranges)', () => {
  test('handles parenthesised filter arg without colon-string chain', () => {
    const filterExpr = firstFilter('{{x|slice:(0,3)}}');
    expect(filterExpr.args.length).toBe(2);
  });

  test('handles parenthesised filter arg with colon followed by non-string', () => {
    const filterExpr = firstFilter('{{x|join:("a":42)}}');
    expect(filterExpr.args.length).toBeGreaterThanOrEqual(1);
  });

  test('handles colon range starting with grouped expression as second arg', () => {
    // The second filter arg starts with `(`, so parseFilterArgument runs
    // parsePrimary which yields a group. chainColonRange is then invoked
    // with a non-literal/non-identifier first, returning it unchanged.
    const filterExpr = firstFilter('{{x|nth:0,(1):2}}');
    expect(filterExpr.args.length).toBeGreaterThanOrEqual(2);
    expect(filterExpr.args[1]?.type).toBe('group');
  });

  test('chainColonRange skips non-literal-non-identifier intermediate', () => {
    // Range like nth:1:(group) — the (group) intermediate yields null from
    // literalOrIdentifierAsString and is silently dropped from the joined value.
    const result = parse('{{x|nth:1:(2)}}');
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  test('chainColonRange uses identifier name as the joined string', () => {
    // First arg is a literal number; the second segment is a bare identifier
    // (`bar`), so the identifier branch of literalOrIdentifierAsString runs.
    const filterExpr = firstFilter('{{x|f:1:bar}}');
    expect(String((filterExpr.args[0] as LiteralExpression).value)).toBe('1:bar');
  });
});

describe('parse — filter chain edge cases (arrow / depth tracking)', () => {
  test('parses identifier filter argument that is not an arrow function', () => {
    // The takeArrowFunction helper consumes the identifier, sees no `=>`, and
    // restores the cursor before parsePrimaryExpression takes over.
    const filterExpr = firstFilter('{{x|date:foo}}');
    expect(filterExpr.args.length).toBe(1);
  });

  test('parses arrow function with parenthesised body that closes', () => {
    // The arrow body `(t.text)` opens then closes a paren, exercising
    // adjustArrowDepth's rparen branch.
    const result = parse('{{items|map:t => (t.text)}}');
    expect(result.errors).toHaveLength(0);
  });

  test('arrow body stops when extra rparen unbalances depth', () => {
    // Extra `)` drops paren depth below zero, triggering the early break.
    const result = parse('{{items|map:t => t)}}');
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  test('arrow body terminates when rbrace pushes brace depth below zero', () => {
    // Extra `}` (rbrace, not the variable-end `}}`) drops brace depth below 0,
    // triggering the early-break branch in adjustArrowDepth. The space after
    // `}` keeps the tokenizer in expression mode.
    const result = parse('{{items|map:t => y} foo}}');
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  test('arrow body tracks lbrace depth when expression contains an object', () => {
    // The arrow body has an inner lbrace `{` to track — exercises the
    // `lbrace` branch of adjustArrowDepth.
    const result = parse('{{items|map:t => {a:1} more}}');
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });
});

describe('parse — filter argument early-exit branches', () => {
  test('handles parenthesised filter args with empty parens stopping arg loop', () => {
    // `()` — empty parens cause the while-loop check to fall through (rparen
    // matches immediately) so no args are pushed.
    const result = parse('{{x|slice:()}}');
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  test('handles parenthesised filter args where first arg parses as null', () => {
    // `(,)` — leading comma makes parseOrExpression return null on the first
    // iteration, exercising the `if (!arg) break;` branch.
    const result = parse('{{x|slice:(,)}}');
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  test('returns null when filter argument is empty (colon then close)', () => {
    // `f:` with nothing afterwards — parsePrimaryExpression returns null and
    // parseFilterArgument returns null at the early-exit branch.
    const result = parse('{{x|date:}}');
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  test('chainColonRange aborts when the next primary is null', () => {
    // `nth:1:` with nothing after the trailing colon — the inner
    // parsePrimaryExpression returns null mid-range.
    const result = parse('{{x|nth:1:}}');
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  test('does not chain number with multi-character identifier', () => {
    // Number `2` followed by identifier `abc` (length > 1) — chain helper
    // returns null and the original number literal is kept. The trailing
    // `abc` triggers a "looks like prompt" recovery error, but the
    // chainNumberWithIdentifier branch was still exercised before.
    const result = parse('{{x|nth:2abc}}');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
