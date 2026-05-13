// Template parser — atomic primary expression parsing.
// Handles literals, identifiers (including special prefixes like `schema:` and
// `selector:`). Grouped `(expr)` and postfix `[index]` live in
// `parser-expressions.ts` to avoid a circular import.

import type { Token } from '@domain/template/tokenizer';

import { advance, check, peek, type ParserState } from './parser-state';
import type { Expression } from './parser-types';

const PREFIX_CHAIN_TOKENS: ReadonlySet<string> = new Set([
  'identifier',
  'dot',
  'colon',
  'lbracket',
  'rbracket',
  'number',
  'string',
  'star',
]);

function makeStringLiteral(token: Token): Expression {
  return {
    type: 'literal',
    value: token.value,
    raw: token.value,
    line: token.line,
    column: token.column,
  };
}

function makeNumberLiteral(token: Token): Expression {
  return {
    type: 'literal',
    value: parseFloat(token.value),
    raw: token.value,
    line: token.line,
    column: token.column,
  };
}

function makeBooleanLiteral(token: Token): Expression {
  return {
    type: 'literal',
    value: token.value.toLowerCase() === 'true',
    raw: token.value,
    line: token.line,
    column: token.column,
  };
}

function makeNullLiteral(token: Token): Expression {
  return {
    type: 'literal',
    value: null,
    raw: 'null',
    line: token.line,
    column: token.column,
  };
}

function buildPrefixIdentifier(state: ParserState, base: string): string {
  let rest = '';
  while (PREFIX_CHAIN_TOKENS.has(peek(state).type)) {
    rest += advance(state).value;
  }
  return `${base}:${rest}`;
}

function parseIdentifier(state: ParserState): Expression {
  const idToken = advance(state);
  let name = idToken.value;

  if (check(state, 'colon')) {
    advance(state);
    name = buildPrefixIdentifier(state, name);
  }

  return {
    type: 'identifier',
    name,
    line: idToken.line,
    column: idToken.column,
  };
}

/**
 * `(expr)` groups: delegates to `state.parseExpr` (injected by `parser.ts`)
 * so this file has no direct import from `parser-expressions.ts`, avoiding
 * the circular dependency via `parser-filter-args.ts`.
 */
function parseGroupedExpression(state: ParserState): Expression | null {
  const parseExpr = state.parseExpr;
  if (!parseExpr) return null;
  const token = advance(state); // consume '('
  const expr = parseExpr(state);
  if (!expr) {
    state.errors.push({
      message: 'Empty parentheses () - add an expression',
      line: token.line,
      column: token.column,
    });
    return null;
  }
  if (check(state, 'rparen')) {
    advance(state);
  } else {
    state.errors.push({
      message: 'Missing closing )',
      line: peek(state).line,
      column: peek(state).column,
    });
  }
  return {
    type: 'group',
    expression: expr,
    line: token.line,
    column: token.column,
  };
}

/**
 * Parse a primary expression — the lowest-precedence atom: literal,
 * identifier (with optional special prefix), or `(expr)` group.
 * Postfix `[index]` access is handled by `parsePostfixExpression` in
 * `parser-expressions.ts`.
 */
export function parsePrimaryExpression(state: ParserState): Expression | null {
  if (check(state, 'lparen')) return parseGroupedExpression(state);
  if (check(state, 'string')) return makeStringLiteral(advance(state));
  if (check(state, 'number')) return makeNumberLiteral(advance(state));
  if (check(state, 'boolean')) return makeBooleanLiteral(advance(state));
  if (check(state, 'null')) return makeNullLiteral(advance(state));
  if (check(state, 'identifier')) return parseIdentifier(state);
  return null;
}
