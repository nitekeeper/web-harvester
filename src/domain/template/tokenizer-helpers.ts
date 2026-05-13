// Template tokenizer — low-level character helpers and state mutators.
// All cursor/position bookkeeping lives here so the higher-level mode
// functions stay focused on grammar.

import type { TokenizerState } from './tokenizer-types';

/**
 * Returns true if the input at the current position matches `str` exactly.
 * Used to peek for multi-character tokens like `{{`, `%}`, `==`.
 */
export function lookAhead(state: TokenizerState, str: string): boolean {
  return state.input.slice(state.pos, state.pos + str.length) === str;
}

/**
 * Advance the cursor by `count` characters, updating line/column for each.
 */
export function advance(state: TokenizerState, count: number): void {
  for (let i = 0; i < count; i++) {
    advanceChar(state);
  }
}

/**
 * Advance the cursor by exactly one character, tracking newlines for accurate
 * line/column reporting.
 */
export function advanceChar(state: TokenizerState): void {
  if (state.pos < state.input.length) {
    if (state.input[state.pos] === '\n') {
      state.line++;
      state.column = 1;
    } else {
      state.column++;
    }
    state.pos++;
  }
}

/**
 * Advance past any run of whitespace characters at the current position.
 */
export function skipWhitespace(state: TokenizerState): void {
  while (state.pos < state.input.length) {
    const ch = state.input[state.pos];
    if (ch === undefined || !isWhitespace(ch)) {
      return;
    }
    advanceChar(state);
  }
}

/**
 * True for ASCII whitespace characters relevant to template syntax.
 */
function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

/**
 * True for ASCII digits 0-9.
 */
export function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

/**
 * True for characters that may begin an identifier. `@` is allowed for
 * schema-prefix identifiers like `schema:@Type`.
 */
export function isIdentifierStart(char: string): boolean {
  return (
    (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '@'
  );
}

/**
 * True for characters that may continue an identifier — adds digits, hyphen
 * (for kebab-case) and dot (for nested property access like `author.name`).
 */
export function isIdentifierChar(char: string): boolean {
  return isIdentifierStart(char) || isDigit(char) || char === '-' || char === '.';
}
