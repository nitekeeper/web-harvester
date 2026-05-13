// Template parser — operator-precedence chain for expressions.
// Implements the recursive descent from `parseExpression` (entry) down to
// `parsePostfixExpression`. Filter, nullish, or, and, not, comparison —
// each layer pulls the next-tighter parser in the chain.

import type { Token, TokenType } from '@domain/template/tokenizer';

import { parseFilterArgument } from './parser-filter-args';
import { parsePostfixExpression } from './parser-primary';
import { advance, check, isAtEnd, peek, type ParserState } from './parser-state';
import type { Expression, FilterExpression, LiteralExpression } from './parser-types';

const COMPARISON_OPS: readonly TokenType[] = [
  'op_eq',
  'op_neq',
  'op_gt',
  'op_lt',
  'op_gte',
  'op_lte',
  'op_contains',
];

function buildBinary(
  operator: string,
  left: Expression,
  right: Expression,
  opToken: Token,
): Expression {
  return {
    type: 'binary',
    operator,
    left,
    right,
    line: opToken.line,
    column: opToken.column,
  };
}

function pushMissingValueAfter(state: ParserState, opToken: Token, label: string): void {
  state.errors.push({
    message: `Missing ${label} after "${opToken.value}"`,
    line: opToken.line,
    column: opToken.column,
  });
}

/**
 * Entry point for expression parsing — delegates to the lowest-precedence
 * level, nullish coalescing.
 */
export function parseExpression(state: ParserState): Expression | null {
  return parseNullishExpression(state);
}

/**
 * Nullish coalescing has lowest precedence: `value ?? fallback`.
 */
function parseNullishExpression(state: ParserState): Expression | null {
  let left = parseFilterExpression(state);
  if (!left) return null;

  while (check(state, 'op_nullish')) {
    const opToken = advance(state);
    const right = parseFilterExpression(state);
    if (!right) {
      state.errors.push({
        message: 'Missing fallback value after ??',
        line: opToken.line,
        column: opToken.column,
      });
      break;
    }
    left = buildBinary('??', left, right, opToken);
  }

  return left;
}

function parseParenthesisedFilterArgs(state: ParserState): Expression[] {
  const args: Expression[] = [];
  advance(state); // consume '('
  while (!check(state, 'rparen') && !isAtEnd(state)) {
    const arg = parseOrExpression(state);
    if (!arg) break;

    if (arg.type === 'literal' && typeof arg.value === 'string' && check(state, 'colon')) {
      args.push(chainColonStringPairs(state, arg));
    } else {
      args.push(arg);
    }

    if (check(state, 'comma')) {
      advance(state);
    } else {
      break;
    }
  }
  if (check(state, 'rparen')) advance(state);
  return args;
}

function chainColonStringPairs(state: ParserState, first: LiteralExpression): Expression {
  const formatStr = (val: unknown): string => `"${String(val)}"`;
  let combined = formatStr(first.value);
  while (check(state, 'colon')) {
    advance(state);
    const next = parseOrExpression(state);
    if (next?.type === 'literal' && typeof next.value === 'string') {
      combined += `:${formatStr(next.value)}`;
    } else {
      break;
    }
  }
  return {
    type: 'literal',
    value: combined,
    raw: combined,
    line: first.line,
    column: first.column,
  };
}

function parseUnparenthesisedFilterArgs(state: ParserState): Expression[] {
  const args: Expression[] = [];
  const arg = parseFilterArgument(state);
  if (arg) args.push(arg);
  while (check(state, 'comma')) {
    advance(state);
    const nextArg = parseFilterArgument(state);
    if (nextArg) args.push(nextArg);
  }
  return args;
}

function parseFilterArgs(state: ParserState): Expression[] {
  if (!check(state, 'colon')) return [];
  advance(state); // consume ':'
  if (check(state, 'lparen')) return parseParenthesisedFilterArgs(state);
  return parseUnparenthesisedFilterArgs(state);
}

function applyOneFilter(state: ParserState, left: Expression): Expression | null {
  advance(state); // consume '|'
  if (!check(state, 'identifier')) {
    state.errors.push({
      message: 'Missing filter name after |',
      line: peek(state).line,
      column: peek(state).column,
    });
    return null;
  }
  const filterToken = advance(state);
  const args = parseFilterArgs(state);
  const expr: FilterExpression = {
    type: 'filter',
    value: left,
    name: filterToken.value,
    args,
    line: filterToken.line,
    column: filterToken.column,
  };
  return expr;
}

/**
 * Filter chain: `value | filter1 | filter2:arg`.
 */
function parseFilterExpression(state: ParserState): Expression | null {
  let left = parseOrExpression(state);
  if (!left) return null;

  while (check(state, 'pipe')) {
    const next = applyOneFilter(state, left);
    if (!next) break;
    left = next;
  }

  return left;
}

/**
 * Logical OR: `left or right`, `left || right`.
 */
export function parseOrExpression(state: ParserState): Expression | null {
  let left = parseAndExpression(state);
  if (!left) return null;

  while (check(state, 'op_or')) {
    const opToken = advance(state);
    const right = parseAndExpression(state);
    if (!right) {
      pushMissingValueAfter(state, opToken, 'value');
      break;
    }
    left = buildBinary('or', left, right, opToken);
  }

  return left;
}

/**
 * Logical AND: `left and right`, `left && right`.
 */
function parseAndExpression(state: ParserState): Expression | null {
  let left = parseNotExpression(state);
  if (!left) return null;

  while (check(state, 'op_and')) {
    const opToken = advance(state);
    const right = parseNotExpression(state);
    if (!right) {
      pushMissingValueAfter(state, opToken, 'value');
      break;
    }
    left = buildBinary('and', left, right, opToken);
  }

  return left;
}

/**
 * Logical NOT: `not expr`, `!expr`. Right-associative.
 */
function parseNotExpression(state: ParserState): Expression | null {
  if (!check(state, 'op_not')) return parseComparisonExpression(state);

  const opToken = advance(state);
  const argument = parseNotExpression(state);
  if (!argument) {
    pushMissingValueAfter(state, opToken, 'value');
    return null;
  }
  return {
    type: 'unary',
    operator: 'not',
    argument,
    line: opToken.line,
    column: opToken.column,
  };
}

/**
 * Comparison: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`. Operator names
 * are read directly off the token's `value` field (the tokenizer emits the
 * source text — e.g. `'=='`, `'contains'` — verbatim).
 */
function parseComparisonExpression(state: ParserState): Expression | null {
  const left = parsePostfixExpression(state);
  if (!left) return null;

  if (!COMPARISON_OPS.some((op) => check(state, op))) return left;

  const opToken = advance(state);
  const right = parsePostfixExpression(state);
  if (!right) {
    pushMissingValueAfter(state, opToken, 'value');
    return left;
  }

  return buildBinary(opToken.value, left, right, opToken);
}
