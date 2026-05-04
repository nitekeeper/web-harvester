// Template tokenizer for the Web Harvester template engine.
// Public entry point — re-exports types and the `tokenize`, `formatToken`,
// `formatError` functions. Implementation is split across sibling modules
// to keep each file under the project's 400-line ceiling.

import { tokenizeTag, tokenizeText, tokenizeVariable } from './tokenizer-modes';
import type { Token, TokenizerError, TokenizerResult, TokenizerState } from './tokenizer-types';

export type { Token, TokenizerError, TokenizerResult, TokenType } from './tokenizer-types';

function dispatch(state: TokenizerState): void {
  switch (state.mode) {
    case 'text':
      tokenizeText(state);
      break;
    case 'variable':
      tokenizeVariable(state);
      break;
    case 'tag':
      tokenizeTag(state);
      break;
  }
}

function recordTrailingError(state: TokenizerState): void {
  if (state.mode === 'variable') {
    state.errors.push({
      message: `Unclosed variable - missing '}}'`,
      line: state.line,
      column: state.column,
    });
  } else if (state.mode === 'tag') {
    state.errors.push({
      message: `Unclosed tag - missing '%}'`,
      line: state.line,
      column: state.column,
    });
  }
}

/**
 * Tokenize a template string into a stream of tokens.
 *
 * @param input - the template string to tokenize
 * @returns the produced tokens plus any non-fatal errors encountered
 */
export function tokenize(input: string): TokenizerResult {
  const state: TokenizerState = {
    input,
    pos: 0,
    line: 1,
    column: 1,
    mode: 'text',
    tokens: [],
    errors: [],
  };

  while (state.pos < state.input.length) {
    dispatch(state);
  }

  recordTrailingError(state);

  state.tokens.push({ type: 'eof', value: '', line: state.line, column: state.column });
  return { tokens: state.tokens, errors: state.errors };
}

/**
 * Format a token as `type("value") at line:column` — useful for debugging
 * and error messages. Tokens with no value are formatted without parentheses.
 */
export function formatToken(token: Token): string {
  const pos = `${token.line}:${token.column}`;
  if (token.value) {
    return `${token.type}(${JSON.stringify(token.value)}) at ${pos}`;
  }
  return `${token.type} at ${pos}`;
}

/**
 * Format a tokenizer error with its source position prefix.
 */
export function formatError(error: TokenizerError): string {
  return `Error at line ${error.line}, column ${error.column}: ${error.message}`;
}
