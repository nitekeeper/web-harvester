// Template parser — primary expression and postfix bracket-access parsing.
// Handles literals, identifiers (including special prefixes like `schema:` and
// `selector:`), grouped expressions, and `expr[index]` member access.

import type { Token } from '@domain/template/tokenizer';

import { parseOrExpression } from './parser-expressions';
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

function parseGroupedExpression(state: ParserState): Expression | null {
  const token = advance(state); // consume '('
  const expr = parseOrExpression(state);
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

/**
 * Parse a primary expression followed by zero or more `[index]` member
 * accesses. Empty brackets and missing closes are reported as errors but
 * recovery continues so the parser can proceed.
 */
export function parsePostfixExpression(state: ParserState): Expression | null {
  let left = parsePrimaryExpression(state);
  if (!left) return null;

  while (check(state, 'lbracket')) {
    const bracketToken = advance(state);
    const property = parseOrExpression(state);
    if (!property) {
      state.errors.push({
        message: 'Empty brackets [] - add an index or key',
        line: bracketToken.line,
        column: bracketToken.column,
      });
      break;
    }
    if (check(state, 'rbracket')) {
      advance(state);
    } else {
      state.errors.push({
        message: 'Missing closing ]',
        line: peek(state).line,
        column: peek(state).column,
      });
    }
    left = {
      type: 'member',
      object: left,
      property,
      computed: true,
      line: bracketToken.line,
      column: bracketToken.column,
    };
  }

  return left;
}
