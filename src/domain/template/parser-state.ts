// Template parser — state representation and low-level cursor helpers.
// All token-stream bookkeeping lives here so the higher-level parsing
// functions can stay focused on grammar.

import type { Token, TokenType } from '@domain/template/tokenizer';

import type { ParserError } from './parser-types';

/**
 * Mutable bookkeeping carried through the recursive-descent parser. Internal
 * — not exposed to consumers of the public API.
 */
export interface ParserState {
  tokens: Token[];
  pos: number;
  errors: ParserError[];
}

const EOF_TOKEN: Token = Object.freeze({ type: 'eof', value: '', line: 0, column: 0 });

/**
 * Return the token at the current cursor without advancing. Falls back to a
 * synthetic EOF token when the cursor has run past the end.
 */
export function peek(state: ParserState): Token {
  return state.tokens[state.pos] ?? EOF_TOKEN;
}

/**
 * Return the current token and advance the cursor by one (unless already at
 * EOF, in which case the cursor stays put).
 */
export function advance(state: ParserState): Token {
  const token = peek(state);
  if (!isAtEnd(state)) {
    state.pos++;
  }
  return token;
}

/**
 * True when the next token has the given type.
 */
export function check(state: ParserState, type: TokenType): boolean {
  return peek(state).type === type;
}

/**
 * True when the cursor has reached the EOF token.
 */
export function isAtEnd(state: ParserState): boolean {
  return peek(state).type === 'eof';
}

/**
 * True when the current token is `tag_start` immediately followed by one of
 * the supplied keyword token types — used to detect `{% else %}`,
 * `{% endif %}`, etc. while inside a parent block.
 */
export function checkTagKeyword(state: ParserState, ...keywords: TokenType[]): boolean {
  if (!check(state, 'tag_start')) return false;
  // `tag_start` is never the final token — the tokenizer always appends `eof`,
  // and a tag_start without a following token would have surfaced an "unclosed
  // tag" error during tokenization. So `state.tokens.at(state.pos + 1)` is
  // safe; the optional chain narrows the noUncheckedIndexedAccess result.
  const nextToken = state.tokens.at(state.pos + 1);
  return nextToken !== undefined && keywords.includes(nextToken.type);
}

/**
 * Consume a `tag_start` token. Callers must verify a `tag_start` is at the
 * cursor (typically via `checkTagKeyword`); calling this when not at a
 * `tag_start` is a bug — the cursor will skip past the wrong token.
 */
export function consumeTagStart(state: ParserState): Token {
  return advance(state);
}

/**
 * Consume a `tag_end` token if present, otherwise record a "missing %}"
 * error and leave the cursor where it is.
 */
export function consumeTagEnd(state: ParserState): void {
  if (check(state, 'tag_end')) {
    advance(state);
    return;
  }
  state.errors.push({
    message: 'Missing closing %}',
    line: peek(state).line,
    column: peek(state).column,
  });
}

/**
 * Discard tokens until a `tag_end` is consumed (or EOF is reached). Used to
 * recover from malformed tags so a single error does not cascade.
 */
export function skipToEndOfTag(state: ParserState): void {
  while (!isAtEnd(state) && !check(state, 'tag_end')) {
    advance(state);
  }
  if (check(state, 'tag_end')) {
    advance(state);
  }
}

/**
 * Discard tokens until a `variable_end` is consumed (or EOF is reached).
 * Used to recover from malformed `{{ ... }}` interpolations.
 */
export function skipToEndOfVariable(state: ParserState): void {
  while (!isAtEnd(state) && !check(state, 'variable_end')) {
    advance(state);
  }
  if (check(state, 'variable_end')) {
    advance(state);
  }
}
