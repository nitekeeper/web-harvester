// Template parser — filter argument parsing.
// Handles the colon/comma-separated argument syntax used by filters, including
// arrow functions, range notation, regex character classes, and quoted-string
// chaining. Lives in its own file because the cognitive complexity exceeds
// what fits cleanly in `parser-expressions.ts`.

import type { Token } from '@domain/template/tokenizer';

import { parsePrimaryExpression } from './parser-primary';
import { advance, check, isAtEnd, peek, type ParserState } from './parser-state';
import type { Expression, LiteralExpression } from './parser-types';

/**
 * Minimal info shared between filter-argument helpers — keeps signatures
 * short and avoids re-reading the same start token in every helper.
 */
interface ArgContext {
  startToken: Token;
}

const STOP_TOKENS_FOR_ARROW = new Set(['pipe', 'variable_end', 'tag_end']);

/**
 * Build a string literal from a raw value, preserving the original source
 * line/column. Used by helpers that synthesise composite arguments.
 */
function rawLiteral(value: string, line: number, column: number): LiteralExpression {
  return {
    type: 'literal',
    value,
    raw: value,
    line,
    column,
  };
}

function takeDelimiterToken(state: ParserState): Expression | null {
  if (!check(state, 'slash') && !check(state, 'star')) return null;
  const token = advance(state);
  return rawLiteral(token.value, token.line, token.column);
}

function takeBracketLiteral(state: ParserState): Expression | null {
  if (!check(state, 'lbracket')) return null;

  const startLine = peek(state).line;
  const startColumn = peek(state).column;
  let value = '';
  let depth = 0;

  while (!isAtEnd(state)) {
    const token = peek(state);
    if (token.type === 'lbracket') depth++;
    else if (token.type === 'rbracket') {
      depth--;
      if (depth === 0) {
        value += token.value;
        advance(state);
        break;
      }
    }
    value += token.value;
    advance(state);
  }

  return rawLiteral(value, startLine, startColumn);
}

/**
 * Track brace/paren depth while scanning arrow-function bodies. Helpers
 * mutate this object so the consumer loop stays readable.
 */
interface ArrowDepth {
  brace: number;
  paren: number;
}

function adjustArrowDepth(depth: ArrowDepth, type: string): boolean {
  if (type === 'lbrace') depth.brace++;
  else if (type === 'lparen') depth.paren++;
  else if (type === 'rbrace') {
    depth.brace--;
    if (depth.brace < 0) return false;
  } else if (type === 'rparen') {
    depth.paren--;
    if (depth.paren < 0) return false;
  }
  return true;
}

function arrowReachedTerminator(depth: ArrowDepth, type: string): boolean {
  return depth.brace === 0 && depth.paren === 0 && STOP_TOKENS_FOR_ARROW.has(type);
}

function appendArrowToken(token: Token, current: string): string {
  if (token.type === 'string') return current + `"${token.value}"`;
  return current + token.value;
}

function consumeArrowBody(state: ParserState): string {
  const depth: ArrowDepth = { brace: 0, paren: 0 };
  let value = '';
  while (!isAtEnd(state)) {
    const token = peek(state);
    if (arrowReachedTerminator(depth, token.type)) break;
    if (!adjustArrowDepth(depth, token.type)) break;
    value = appendArrowToken(token, value);
    advance(state);
  }
  return value;
}

function takeArrowFunction(state: ParserState, ctx: ArgContext): Expression | null {
  if (!check(state, 'identifier')) return null;
  const savedPos = state.pos;
  const idToken = advance(state);

  if (!check(state, 'arrow')) {
    state.pos = savedPos;
    return null;
  }

  let body = `${idToken.value} `;
  body += `${advance(state).value} `;
  body += consumeArrowBody(state);

  const trimmed = body.trim();
  return rawLiteral(trimmed, ctx.startToken.line, ctx.startToken.column);
}

function chainQuotedString(state: ParserState, first: LiteralExpression): Expression {
  const formatStr = (val: unknown): string => `"${String(val)}"`;
  let combined = '';
  let chained = false;

  while (check(state, 'colon')) {
    const savedPos = state.pos;
    advance(state);
    if (!check(state, 'string')) {
      state.pos = savedPos;
      break;
    }
    const next = parsePrimaryExpression(state);
    if (next?.type === 'literal') {
      if (!chained) {
        combined = formatStr(first.value);
        chained = true;
      }
      combined += `:${formatStr(next.value)}`;
    }
  }

  if (!chained) return first;
  return rawLiteral(combined, first.line, first.column);
}

function chainNumberWithIdentifier(
  state: ParserState,
  first: LiteralExpression,
): Expression | null {
  const idToken = peek(state);
  if (idToken.value.length !== 1 || !/^[a-z]$/i.test(idToken.value)) return null;
  advance(state);
  const combined = String(first.value) + idToken.value;
  return rawLiteral(combined, first.line, first.column);
}

function literalOrIdentifierAsString(expr: Expression): string | null {
  if (expr.type === 'literal') return String(expr.value);
  if (expr.type === 'identifier') return expr.name;
  return null;
}

function chainColonRange(state: ParserState, first: Expression, ctx: ArgContext): Expression {
  const initial = literalOrIdentifierAsString(first);
  if (initial === null) {
    return first;
  }

  let value = initial;
  // `check(state, 'colon')` is false at EOF (the EOF token's type is `eof`),
  // so an explicit `!isAtEnd(state)` guard would be redundant here.
  while (check(state, 'colon')) {
    advance(state);
    value += ':';
    const next = parsePrimaryExpression(state);
    if (!next) break;
    const nextText = literalOrIdentifierAsString(next);
    if (nextText !== null) value += nextText;
  }

  return rawLiteral(value, ctx.startToken.line, ctx.startToken.column);
}

function continueAfterPrimary(state: ParserState, first: Expression, ctx: ArgContext): Expression {
  const startToken = ctx.startToken;

  if (first.type === 'literal' && startToken.type === 'string') {
    return chainQuotedString(state, first);
  }

  if (first.type === 'literal' && startToken.type === 'number' && check(state, 'identifier')) {
    const chained = chainNumberWithIdentifier(state, first);
    if (chained) return chained;
  }

  if (!check(state, 'colon')) return first;

  return chainColonRange(state, first, ctx);
}

/**
 * Parse a single filter argument that may contain colon-separated parts (for
 * ranges), arrow functions, regex character classes, or chained quoted
 * strings. Returns a string literal or the raw primary expression.
 */
export function parseFilterArgument(state: ParserState): Expression | null {
  const ctx: ArgContext = { startToken: peek(state) };

  const delim = takeDelimiterToken(state);
  if (delim) return delim;

  const bracket = takeBracketLiteral(state);
  if (bracket) return bracket;

  const arrow = takeArrowFunction(state, ctx);
  if (arrow) return arrow;

  const first = parsePrimaryExpression(state);
  if (!first) return null;

  return continueAfterPrimary(state, first, ctx);
}
