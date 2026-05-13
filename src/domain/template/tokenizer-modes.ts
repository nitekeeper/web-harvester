// Template tokenizer — mode dispatchers for text, variable, tag, expression.

import {
  advance,
  advanceChar,
  isDigit,
  isIdentifierStart,
  lookAhead,
  skipWhitespace,
} from './tokenizer-helpers';
import {
  tokenizeEscapedArgument,
  tokenizeIdentifier,
  tokenizeNumber,
  tokenizeString,
} from './tokenizer-literals';
import type { TokenizerState, TokenType } from './tokenizer-types';

const VALID_AFTER_BRACE: ReadonlySet<string> = new Set(['|', ',', ')', ']', ' ', '\t', '\n', '\r']);

const SINGLE_CHAR_OPS: Readonly<Record<string, TokenType>> = Object.freeze({
  '>': 'op_gt',
  '<': 'op_lt',
  '!': 'op_not',
  '=': 'op_assign',
  '|': 'pipe',
  '(': 'lparen',
  ')': 'rparen',
  '[': 'lbracket',
  ']': 'rbracket',
  ':': 'colon',
  ',': 'comma',
  '.': 'dot',
  '*': 'star',
  '/': 'slash',
  '{': 'lbrace',
  '}': 'rbrace',
  $: 'dollar',
});

function lookupSingleChar(char: string): TokenType | undefined {
  if (Object.prototype.hasOwnProperty.call(SINGLE_CHAR_OPS, char)) {
    return SINGLE_CHAR_OPS[char as keyof typeof SINGLE_CHAR_OPS];
  }
  return undefined;
}

function emitText(state: TokenizerState, startPos: number, line: number, column: number): void {
  if (state.pos > startPos) {
    state.tokens.push({
      type: 'text',
      value: state.input.slice(startPos, state.pos),
      line,
      column,
    });
  }
}

function startVariable(
  state: TokenizerState,
  startPos: number,
  line: number,
  column: number,
): void {
  emitText(state, startPos, line, column);
  advance(state, 2);
  state.tokens.push({
    type: 'variable_start',
    value: '{{',
    line: state.line,
    column: state.column - 2,
    trimLeft: false,
  });
  state.mode = 'variable';
}

function startTag(state: TokenizerState, startPos: number, line: number, column: number): void {
  emitText(state, startPos, line, column);
  advance(state, 2);
  state.tokens.push({
    type: 'tag_start',
    value: '{%',
    line: state.line,
    column: state.column - 2,
    trimLeft: false,
  });
  state.mode = 'tag';
}

/**
 * Tokenize plain text content until a `{{` or `{%` opener is found.
 */
export function tokenizeText(state: TokenizerState): void {
  const startPos = state.pos;
  const startLine = state.line;
  const startColumn = state.column;

  while (state.pos < state.input.length) {
    if (lookAhead(state, '{{')) {
      startVariable(state, startPos, startLine, startColumn);
      return;
    }
    if (lookAhead(state, '{%')) {
      startTag(state, startPos, startLine, startColumn);
      return;
    }
    advanceChar(state);
  }
  emitText(state, startPos, startLine, startColumn);
}

function reportUnclosed(
  state: TokenizerState,
  startType: 'variable_start' | 'tag_start',
  message: string,
): void {
  // tokenizeVariable / tokenizeTag are only entered after the matching opener
  // was emitted, so a start token of `startType` is guaranteed to exist.
  let idx = state.tokens.length - 1;
  let startToken = state.tokens.at(idx);
  while (startToken?.type !== startType) {
    idx--;
    startToken = state.tokens.at(idx);
  }
  state.errors.push({ message, line: startToken.line, column: startToken.column });
  state.tokens.splice(idx);
  state.mode = 'text';
}

function handleMalformedVariableEnd(state: TokenizerState): void {
  state.errors.push({
    message: `Malformed variable: expected '}}' but found '}'. Did you forget a '}'?`,
    line: state.line,
    column: state.column,
  });
  state.tokens.push({
    type: 'variable_end',
    value: '}',
    line: state.line,
    column: state.column,
    trimRight: false,
  });
  advanceChar(state);
  state.mode = 'text';
}

/**
 * Tokenize content inside a `{{ ... }}` variable expression.
 */
export function tokenizeVariable(state: TokenizerState): void {
  skipWhitespace(state);

  if (lookAhead(state, '}}')) {
    state.tokens.push({
      type: 'variable_end',
      value: '}}',
      line: state.line,
      column: state.column,
      trimRight: false,
    });
    advance(state, 2);
    state.mode = 'text';
    return;
  }

  const here = state.input[state.pos];
  const next = state.input.charAt(state.pos + 1);
  if (here === '}' && next !== '}' && !VALID_AFTER_BRACE.has(next)) {
    handleMalformedVariableEnd(state);
    return;
  }

  if (lookAhead(state, '{%') || lookAhead(state, '{{')) {
    reportUnclosed(state, 'variable_start', `Missing closing '}}' for variable`);
    return;
  }

  tokenizeExpression(state, 'variable');
}

function emitTagEnd(state: TokenizerState, value: string, advanceBy: number): void {
  state.tokens.push({
    type: 'tag_end',
    value,
    line: state.line,
    column: state.column,
    trimRight: true,
  });
  advance(state, advanceBy);
  state.mode = 'text';
}

function handleMalformedTagEnd(state: TokenizerState): boolean {
  if (state.input[state.pos] === '}' && state.pos > 0 && state.input[state.pos - 1] !== '%') {
    state.errors.push({
      message: `Malformed tag: expected '%}' but found '}'. Did you forget the '%'?`,
      line: state.line,
      column: state.column,
    });
    state.tokens.push({
      type: 'tag_end',
      value: '}',
      line: state.line,
      column: state.column,
      trimRight: true,
    });
    advanceChar(state);
    state.mode = 'text';
    return true;
  }
  return false;
}

/**
 * Tokenize content inside a `{% ... %}` tag block.
 */
export function tokenizeTag(state: TokenizerState): void {
  skipWhitespace(state);

  if (lookAhead(state, '%}')) {
    emitTagEnd(state, '%}', 2);
    return;
  }
  if (lookAhead(state, '-%}')) {
    emitTagEnd(state, '-%}', 3);
    return;
  }
  if (handleMalformedTagEnd(state)) return;
  if (lookAhead(state, '{%') || lookAhead(state, '{{')) {
    reportUnclosed(state, 'tag_start', `Missing closing '%}' for tag`);
    return;
  }
  tokenizeExpression(state, 'tag');
}

/**
 * Lookup-table entry for a multi-character operator (e.g. `==`, `!=`).
 */
interface MultiCharOp {
  readonly chars: string;
  readonly type: TokenType;
}

const MULTI_CHAR_OPS: readonly MultiCharOp[] = [
  { chars: '==', type: 'op_eq' },
  { chars: '!=', type: 'op_neq' },
  { chars: '>=', type: 'op_gte' },
  { chars: '<=', type: 'op_lte' },
  { chars: '&&', type: 'op_and' },
  { chars: '||', type: 'op_or' },
  { chars: '??', type: 'op_nullish' },
  { chars: '=>', type: 'arrow' },
];

function tryMultiCharOp(state: TokenizerState, line: number, column: number): boolean {
  for (const op of MULTI_CHAR_OPS) {
    if (lookAhead(state, op.chars)) {
      state.tokens.push({ type: op.type, value: op.chars, line, column });
      advance(state, op.chars.length);
      return true;
    }
  }
  return false;
}

function trySingleCharOp(
  state: TokenizerState,
  char: string,
  line: number,
  column: number,
): boolean {
  const type = lookupSingleChar(char);
  if (!type) return false;
  state.tokens.push({ type, value: char, line, column });
  advanceChar(state);
  return true;
}

function reportExpressionEofError(state: TokenizerState, mode: 'variable' | 'tag'): void {
  state.errors.push({
    message:
      mode === 'variable' ? `Unclosed variable - missing '}}'` : `Unclosed tag - missing '%}'`,
    line: state.line,
    column: state.column,
  });
}

/**
 * Tokenize a single expression element shared between variable and tag modes
 * (a literal, identifier, operator, or punctuation).
 */
function tokenizeExpression(state: TokenizerState, mode: 'variable' | 'tag'): void {
  skipWhitespace(state);

  if (state.pos >= state.input.length) {
    reportExpressionEofError(state, mode);
    return;
  }

  const char = state.input.charAt(state.pos);
  const startLine = state.line;
  const startColumn = state.column;

  if (char === '"' || char === "'") {
    tokenizeString(state);
    return;
  }
  if (isDigit(char) || (char === '-' && isDigit(state.input.charAt(state.pos + 1)))) {
    tokenizeNumber(state);
    return;
  }
  if (tryMultiCharOp(state, startLine, startColumn)) return;
  if (trySingleCharOp(state, char, startLine, startColumn)) return;
  if (isIdentifierStart(char)) {
    tokenizeIdentifier(state);
    return;
  }
  if (char === '\\') {
    tokenizeEscapedArgument(state);
    return;
  }

  state.errors.push({
    message: `Unexpected character '${char}' in template`,
    line: state.line,
    column: state.column,
  });
  advanceChar(state);
}
