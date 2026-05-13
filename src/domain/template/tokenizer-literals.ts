// Template tokenizer — literal and identifier tokenization.
// Strings, numbers, identifiers, CSS selectors, and escaped filter arguments.

import { advanceChar, isDigit, isIdentifierChar } from './tokenizer-helpers';
import { lookupKeyword, type TokenizerState } from './tokenizer-types';

const STRING_ESCAPE_MAP: ReadonlyMap<string, string> = new Map([
  ['n', '\n'],
  ['t', '\t'],
  ['r', '\r'],
  ['\\', '\\'],
  ['"', '"'],
  ["'", "'"],
]);

const ARGUMENT_ESCAPE_MAP: ReadonlyMap<string, string> = new Map([
  ['"', '"'],
  ["'", "'"],
  ['\\', '\\'],
  ['n', '\n'],
  ['t', '\t'],
  ['r', '\r'],
  [',', ','],
  ['|', '|'],
]);

function decodeEscape(table: ReadonlyMap<string, string>, escaped: string): string {
  return table.get(escaped) ?? escaped;
}

function isStringTerminator(char: string, nextChar: string): boolean {
  return (char === '}' && nextChar === '}') || (char === '%' && nextChar === '}');
}

function appendStringEscape(state: TokenizerState): string {
  advanceChar(state);
  const escaped = state.input.charAt(state.pos);
  const decoded = decodeEscape(STRING_ESCAPE_MAP, escaped);
  advanceChar(state);
  return decoded;
}

/**
 * Tokenize a quoted string literal. Handles `\n`, `\t`, `\r`, `\\`, `\"`,
 * `\'` escapes; emits a partial string with an error if the closing quote is
 * missing or the string is interrupted by `}}` / `%}`.
 */
export function tokenizeString(state: TokenizerState): void {
  // Caller (tokenizeExpression) only invokes this when the current char is
  // a quote character, so the quote is guaranteed to be defined.
  const quote = state.input.charAt(state.pos);
  const startLine = state.line;
  const startColumn = state.column;
  let value = '';
  advanceChar(state);

  while (state.pos < state.input.length) {
    const char = state.input.charAt(state.pos);
    const nextChar = state.input.charAt(state.pos + 1);
    if (char === quote) {
      advanceChar(state);
      state.tokens.push({ type: 'string', value, line: startLine, column: startColumn });
      return;
    }
    if (isStringTerminator(char, nextChar)) {
      state.errors.push({
        message: `Unclosed string - missing ${quote} before ${char}${nextChar}`,
        line: startLine,
        column: startColumn,
      });
      state.tokens.push({ type: 'string', value, line: startLine, column: startColumn });
      return;
    }
    if (char === '\\' && state.pos + 1 < state.input.length) {
      value += appendStringEscape(state);
      continue;
    }
    value += char;
    advanceChar(state);
  }

  state.errors.push({
    message: `Unclosed string - missing closing ${quote}`,
    line: startLine,
    column: startColumn,
  });
  state.tokens.push({ type: 'string', value, line: startLine, column: startColumn });
}

function isArgumentTerminator(char: string, nextChar: string): boolean {
  return (
    char === '|' ||
    char === '%' ||
    char === '}' ||
    char === ')' ||
    (char === '+' && (nextChar === '%' || nextChar === '}'))
  );
}

/**
 * Tokenize an escaped filter argument like `\"foo\"` — content starts with a
 * backslash and runs until a delimiter (`|`, `}}`, `%}`, `)`). Escape
 * sequences are decoded into a single string token.
 */
export function tokenizeEscapedArgument(state: TokenizerState): void {
  const startLine = state.line;
  const startColumn = state.column;
  let value = '';

  while (state.pos < state.input.length) {
    const char = state.input.charAt(state.pos);
    const nextChar = state.input.charAt(state.pos + 1);
    if (isArgumentTerminator(char, nextChar)) break;
    if (char === '\\' && state.pos + 1 < state.input.length) {
      const escaped = state.input.charAt(state.pos + 1);
      value += decodeEscape(ARGUMENT_ESCAPE_MAP, escaped);
      advanceChar(state);
      advanceChar(state);
      continue;
    }
    value += char;
    advanceChar(state);
  }

  state.tokens.push({ type: 'string', value, line: startLine, column: startColumn });
}

/**
 * Tokenize a numeric literal. Supports an optional leading minus, an integer
 * part, and an optional fractional part.
 */
export function tokenizeNumber(state: TokenizerState): void {
  const startLine = state.line;
  const startColumn = state.column;
  let value = '';

  if (state.input[state.pos] === '-') {
    value += '-';
    advanceChar(state);
  }

  while (state.pos < state.input.length) {
    const ch = state.input[state.pos];
    if (ch === undefined || !isDigit(ch)) break;
    value += ch;
    advanceChar(state);
  }

  if (state.pos < state.input.length && state.input[state.pos] === '.') {
    value += '.';
    advanceChar(state);
    while (state.pos < state.input.length) {
      const ch = state.input[state.pos];
      if (ch === undefined || !isDigit(ch)) break;
      value += ch;
      advanceChar(state);
    }
  }

  state.tokens.push({ type: 'number', value, line: startLine, column: startColumn });
}

/**
 * Tokenize an identifier or keyword. CSS selector prefixes (`selector:` and
 * `selectorHtml:`) are detected here and dispatched to `tokenizeCssSelector`
 * to absorb the entire selector body as a single identifier.
 */
export function tokenizeIdentifier(state: TokenizerState): void {
  const startLine = state.line;
  const startColumn = state.column;
  let value = '';

  while (state.pos < state.input.length) {
    const ch = state.input[state.pos];
    if (ch === undefined || !isIdentifierChar(ch)) break;
    value += ch;
    advanceChar(state);
  }

  if (
    (value === 'selector' || value === 'selectorHtml') &&
    state.pos < state.input.length &&
    state.input[state.pos] === ':'
  ) {
    value += ':';
    advanceChar(state);
    value = tokenizeCssSelector(state, value);
  }

  const keywordType = lookupKeyword(value.toLowerCase());
  if (keywordType) {
    state.tokens.push({ type: keywordType, value, line: startLine, column: startColumn });
  } else {
    state.tokens.push({ type: 'identifier', value, line: startLine, column: startColumn });
  }
}

/**
 * Internal bookkeeping while scanning a CSS selector body — tracks bracket
 * nesting, paren nesting, and the active string-quote (if any).
 */
interface SelectorState {
  bracketDepth: number;
  parenDepth: number;
  inString: string | null;
}

function isSelectorEnd(state: TokenizerState, sel: SelectorState): boolean {
  if (sel.inString || sel.bracketDepth > 0 || sel.parenDepth > 0) return false;
  const ch = state.input.charAt(state.pos);
  const nx = state.input.charAt(state.pos + 1);
  return (
    ch === '|' ||
    (ch === '%' && nx === '}') ||
    ch === '}' ||
    (ch === '-' && (nx === '%' || nx === '}'))
  );
}

function reportSelectorClosingErrors(state: TokenizerState, sel: SelectorState): boolean {
  const ch = state.input.charAt(state.pos);
  const nx = state.input.charAt(state.pos + 1);
  if (!((ch === '}' && nx === '}') || (ch === '%' && nx === '}'))) return false;
  // Caller (tokenizeCssSelector) only invokes this when isSelectorEnd is false,
  // which means at least one of inString / bracketDepth / parenDepth must be set.
  let message: string;
  if (sel.inString) {
    message = `Unclosed string in selector - missing closing ${sel.inString}`;
  } else if (sel.bracketDepth > 0) {
    message = `Unclosed '[' in selector - missing ']'`;
  } else {
    message = `Unclosed '(' in selector - missing ')'`;
  }
  state.errors.push({ message, line: state.line, column: state.column });
  return true;
}

function handleSelectorString(state: TokenizerState, sel: SelectorState, char: string): string {
  if (!sel.inString && (char === '"' || char === "'")) {
    sel.inString = char;
    advanceChar(state);
    return char;
  }
  if (sel.inString && char === sel.inString) {
    sel.inString = null;
    advanceChar(state);
    return char;
  }
  if (sel.inString && char === '\\' && state.pos + 1 < state.input.length) {
    const next = state.input.charAt(state.pos + 1);
    advanceChar(state);
    advanceChar(state);
    return char + next;
  }
  return '';
}

function trackSelectorDepth(state: TokenizerState, sel: SelectorState, char: string): void {
  if (sel.inString) return;
  if (char === '[') sel.bracketDepth++;
  else if (char === ']') {
    sel.bracketDepth--;
    if (sel.bracketDepth < 0) {
      state.errors.push({
        message: `Extra ']' in selector - no matching '['`,
        line: state.line,
        column: state.column,
      });
      sel.bracketDepth = 0;
    }
  } else if (char === '(') sel.parenDepth++;
  else if (char === ')') {
    sel.parenDepth--;
    if (sel.parenDepth < 0) {
      state.errors.push({
        message: `Extra ')' in selector - no matching '('`,
        line: state.line,
        column: state.column,
      });
      sel.parenDepth = 0;
    }
  }
}

/**
 * Continue tokenizing a CSS selector after a `selector:` / `selectorHtml:`
 * prefix. The selector body may contain spaces, combinators, attribute
 * brackets, pseudo-class parentheses, and quoted strings. We only stop at
 * actual template delimiters.
 */
function tokenizeCssSelector(state: TokenizerState, prefix: string): string {
  const sel: SelectorState = { bracketDepth: 0, parenDepth: 0, inString: null };
  let value = prefix;

  while (state.pos < state.input.length) {
    if (isSelectorEnd(state, sel)) break;
    if (reportSelectorClosingErrors(state, sel)) break;

    const char = state.input.charAt(state.pos);
    const nextChar = state.input.charAt(state.pos + 1);

    if (!sel.inString && char === '\\' && (nextChar === '"' || nextChar === "'")) {
      value += char;
      advanceChar(state);
      value += state.input.charAt(state.pos);
      advanceChar(state);
      continue;
    }

    const stringDelta = handleSelectorString(state, sel, char);
    if (stringDelta) {
      value += stringDelta;
      continue;
    }

    trackSelectorDepth(state, sel, char);
    value += char;
    advanceChar(state);
  }

  return value.trimEnd();
}
