// Template parser — control-flow statement parsing.
// Implements `{% if %}`, `{% for %}`, and `{% set %}` headers/bodies plus
// their shared helpers. The top-level dispatch (parseTemplate / parseNode)
// lives in `parser-statements.ts` and delegates here for control tags.

import type { Token, TokenType } from '@domain/template/tokenizer';

import { parseExpression } from './parser-expressions';
import {
  advance,
  check,
  checkTagKeyword,
  consumeTagEnd,
  consumeTagStart,
  peek,
  skipToEndOfTag,
  type ParserState,
} from './parser-state';
import type { ASTNode, Expression, ForNode, IfNode, SetNode } from './parser-types';

/**
 * Parse zero or more nodes until one of the supplied stop keywords is
 * encountered as the next tag keyword. Used to read `{% if %}` / `{% for %}`
 * bodies up to their terminator. Imported lazily to avoid a circular
 * import with `parser-statements.ts`.
 */
type ParseBodyFn = (state: ParserState, stopKeywords: TokenType[]) => ASTNode[];

function pushHereError(state: ParserState, message: string): void {
  state.errors.push({
    message,
    line: peek(state).line,
    column: peek(state).column,
  });
}

function consumeTrimmableTagEnd(state: ParserState, missingMessage: string): boolean {
  if (check(state, 'tag_end')) {
    return advance(state).trimRight === true;
  }
  pushHereError(state, missingMessage);
  return false;
}

function parseIfHeader(
  state: ParserState,
  startToken: Token,
): { condition: Expression; trimRight: boolean } | null {
  advance(state); // consume 'if'

  const condition = parseExpression(state);
  if (!condition) {
    state.errors.push({
      message: '{% if %} requires a condition',
      line: startToken.line,
      column: startToken.column,
    });
    skipToEndOfTag(state);
    return null;
  }

  let trimRight = false;
  if (check(state, 'tag_end')) {
    trimRight = advance(state).trimRight === true;
  } else {
    state.errors.push({
      message: 'Missing %} to close {% if %}',
      line: peek(state).line,
      column: peek(state).column,
    });
  }
  return { condition, trimRight };
}

function parseElseifs(
  state: ParserState,
  parseBody: ParseBodyFn,
): { condition: Expression; body: ASTNode[] }[] {
  const elseifs: { condition: Expression; body: ASTNode[] }[] = [];
  while (checkTagKeyword(state, 'keyword_elseif')) {
    consumeTagStart(state);
    advance(state); // consume 'elseif'
    const elseifCondition = parseExpression(state);
    if (!elseifCondition) {
      state.errors.push({
        message: '{% elseif %} requires a condition',
        line: peek(state).line,
        column: peek(state).column,
      });
      skipToEndOfTag(state);
      continue;
    }
    consumeTagEnd(state);
    const elseifBody = parseBody(state, ['keyword_elseif', 'keyword_else', 'keyword_endif']);
    elseifs.push({ condition: elseifCondition, body: elseifBody });
  }
  return elseifs;
}

function parseAlternate(state: ParserState, parseBody: ParseBodyFn): ASTNode[] | null {
  if (!checkTagKeyword(state, 'keyword_else')) return null;
  consumeTagStart(state);
  advance(state); // consume 'else'
  consumeTagEnd(state);
  return parseBody(state, ['keyword_endif']);
}

function consumeEndif(state: ParserState): void {
  if (checkTagKeyword(state, 'keyword_endif')) {
    consumeTagStart(state);
    advance(state); // consume 'endif'
    consumeTagEnd(state);
    return;
  }
  state.errors.push({
    message: 'Missing {% endif %} to close {% if %}',
    line: peek(state).line,
    column: peek(state).column,
  });
}

/**
 * Parse the body of an `{% if %}` block: condition header, consequent body,
 * any `{% elseif %}` branches, an optional `{% else %}`, and the closing
 * `{% endif %}`.
 */
export function parseIfStatement(
  state: ParserState,
  startToken: Token,
  trimLeft: boolean,
  parseBody: ParseBodyFn,
): IfNode | null {
  const header = parseIfHeader(state, startToken);
  if (!header) return null;

  const consequent = parseBody(state, ['keyword_elseif', 'keyword_else', 'keyword_endif']);
  const elseifs = parseElseifs(state, parseBody);
  const alternate = parseAlternate(state, parseBody);
  consumeEndif(state);

  return {
    type: 'if',
    condition: header.condition,
    consequent,
    elseifs,
    alternate,
    trimLeft,
    trimRight: header.trimRight,
    line: startToken.line,
    column: startToken.column,
  };
}

function parseForIterator(state: ParserState): string | null {
  if (!check(state, 'identifier')) {
    pushHereError(state, '{% for %} requires a variable name, e.g. {% for item in items %}');
    skipToEndOfTag(state);
    return null;
  }
  return advance(state).value;
}

function parseForIterable(state: ParserState): Expression | null {
  if (!check(state, 'keyword_in')) {
    pushHereError(state, '{% for %} requires "in" keyword, e.g. {% for item in items %}');
    skipToEndOfTag(state);
    return null;
  }
  advance(state); // consume 'in'

  const iterable = parseExpression(state);
  if (!iterable) {
    pushHereError(state, '{% for %} requires something to loop over after "in"');
    skipToEndOfTag(state);
    return null;
  }
  return iterable;
}

function parseForHeader(
  state: ParserState,
): { iterator: string; iterable: Expression; trimRight: boolean } | null {
  advance(state); // consume 'for'

  const iterator = parseForIterator(state);
  if (iterator === null) return null;

  const iterable = parseForIterable(state);
  if (!iterable) return null;

  const trimRight = consumeTrimmableTagEnd(state, 'Missing %} to close {% for %}');
  return { iterator, iterable, trimRight };
}

function consumeEndfor(state: ParserState): void {
  if (checkTagKeyword(state, 'keyword_endfor')) {
    consumeTagStart(state);
    advance(state); // consume 'endfor'
    consumeTagEnd(state);
    return;
  }
  state.errors.push({
    message: 'Missing {% endfor %} to close {% for %}',
    line: peek(state).line,
    column: peek(state).column,
  });
}

/**
 * Parse the body of a `{% for %}` block: header (`for var in iterable`),
 * loop body, and the closing `{% endfor %}`.
 */
export function parseForStatement(
  state: ParserState,
  startToken: Token,
  trimLeft: boolean,
  parseBody: ParseBodyFn,
): ForNode | null {
  const header = parseForHeader(state);
  if (!header) return null;

  const body = parseBody(state, ['keyword_endfor']);
  consumeEndfor(state);

  return {
    type: 'for',
    iterator: header.iterator,
    iterable: header.iterable,
    body,
    trimLeft,
    trimRight: header.trimRight,
    line: startToken.line,
    column: startToken.column,
  };
}

function parseSetVariable(state: ParserState): string | null {
  if (!check(state, 'identifier')) {
    pushHereError(state, '{% set %} requires a variable name, e.g. {% set name = value %}');
    skipToEndOfTag(state);
    return null;
  }
  return advance(state).value;
}

function parseSetValue(state: ParserState): Expression | null {
  if (!check(state, 'op_assign')) {
    pushHereError(state, '{% set %} requires "=" after variable name');
    skipToEndOfTag(state);
    return null;
  }
  advance(state); // consume '='

  const value = parseExpression(state);
  if (!value) {
    pushHereError(state, '{% set %} requires a value after "="');
    skipToEndOfTag(state);
    return null;
  }
  return value;
}

function parseSetHeader(
  state: ParserState,
): { variable: string; value: Expression; trimRight: boolean } | null {
  advance(state); // consume 'set'

  const variable = parseSetVariable(state);
  if (variable === null) return null;

  const value = parseSetValue(state);
  if (!value) return null;

  const trimRight = consumeTrimmableTagEnd(state, 'Missing %} to close {% set %}');
  return { variable, value, trimRight };
}

/**
 * Parse a `{% set name = value %}` tag. Single-line — no body or closing tag.
 */
export function parseSetStatement(
  state: ParserState,
  startToken: Token,
  trimLeft: boolean,
): SetNode | null {
  const header = parseSetHeader(state);
  if (!header) return null;

  return {
    type: 'set',
    variable: header.variable,
    value: header.value,
    trimLeft,
    trimRight: header.trimRight,
    line: startToken.line,
    column: startToken.column,
  };
}
