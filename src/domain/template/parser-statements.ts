// Template parser — top-level dispatch and node parsing.
// Walks the token stream and emits text/variable/tag AST nodes. Control-flow
// tag bodies (`{% if %}`, `{% for %}`, `{% set %}`) are delegated to
// `parser-control.ts` to keep this file focused on the high-level loop.

import type { Token, TokenType } from '@domain/template/tokenizer';

import { parseIfStatement, parseForStatement, parseSetStatement } from './parser-control';
import { parseExpression } from './parser-expressions';
import {
  advance,
  check,
  checkTagKeyword,
  isAtEnd,
  peek,
  skipToEndOfTag,
  skipToEndOfVariable,
  type ParserState,
} from './parser-state';
import type { ASTNode, TextNode, VariableNode } from './parser-types';

const MAX_PROMPT_LOOKAHEAD = 10;

/**
 * Iterate the token stream and produce a list of top-level AST nodes,
 * stopping at EOF.
 */
export function parseTemplate(state: ParserState): ASTNode[] {
  const nodes: ASTNode[] = [];
  while (!isAtEnd(state)) {
    const node = parseNode(state);
    if (node) nodes.push(node);
  }
  return nodes;
}

/**
 * Dispatch a single AST node based on the next token type. Callers must
 * check `isAtEnd` first; this function does not handle the `eof` token.
 */
function parseNode(state: ParserState): ASTNode | null {
  const token = peek(state);
  switch (token.type) {
    case 'text':
      return parseText(state);
    case 'variable_start':
      return parseVariable(state);
    case 'tag_start':
      return parseTag(state);
    default:
      state.errors.push({
        message: `Unexpected "${token.value}" in template`,
        line: token.line,
        column: token.column,
      });
      advance(state);
      return null;
  }
}

function parseText(state: ParserState): TextNode {
  const token = advance(state);
  return {
    type: 'text',
    value: token.value,
    line: token.line,
    column: token.column,
  };
}

function looksLikeUnquotedPrompt(state: ParserState): boolean {
  if (!check(state, 'identifier')) return false;
  let extra = 0;
  const saved = state.pos;
  while (check(state, 'identifier') && extra < MAX_PROMPT_LOOKAHEAD) {
    advance(state);
    extra++;
  }
  state.pos = saved;
  return extra > 0;
}

function consumeVariableEnd(state: ParserState): boolean {
  if (check(state, 'variable_end')) {
    return advance(state).trimRight === true;
  }
  state.errors.push({
    message: 'Missing closing }}',
    line: peek(state).line,
    column: peek(state).column,
  });
  return false;
}

function parseVariable(state: ParserState): VariableNode | null {
  const startToken = advance(state);
  const trimLeft = startToken.trimLeft === true;

  const expression = parseExpression(state);
  if (!expression) {
    state.errors.push({
      message: 'Empty variable - add a variable name between {{ and }}',
      line: startToken.line,
      column: startToken.column,
    });
    skipToEndOfVariable(state);
    return null;
  }

  if (looksLikeUnquotedPrompt(state)) {
    state.errors.push({
      message: 'Unknown variable. If this is a prompt, wrap it in quotes: {{"your prompt here"}}',
      line: startToken.line,
      column: startToken.column,
    });
    skipToEndOfVariable(state);
    return null;
  }

  const trimRight = consumeVariableEnd(state);

  return {
    type: 'variable',
    expression,
    trimLeft,
    trimRight,
    line: startToken.line,
    column: startToken.column,
  };
}

function reportUnexpectedTagKeyword(state: ParserState, keywordToken: Token): null {
  state.errors.push({
    message: `Unexpected {% ${keywordToken.value} %} - no matching opening tag`,
    line: keywordToken.line,
    column: keywordToken.column,
  });
  skipToEndOfTag(state);
  return null;
}

function reportUnknownTag(state: ParserState, keywordToken: Token): null {
  state.errors.push({
    message: `Unknown tag: {% ${keywordToken.value} %}`,
    line: keywordToken.line,
    column: keywordToken.column,
  });
  skipToEndOfTag(state);
  return null;
}

function parseTag(state: ParserState): ASTNode | null {
  const startToken = advance(state);
  const trimLeft = startToken.trimLeft === true;
  const keywordToken = peek(state);

  switch (keywordToken.type) {
    case 'keyword_if':
      return parseIfStatement(state, startToken, trimLeft, parseBody);
    case 'keyword_for':
      return parseForStatement(state, startToken, trimLeft, parseBody);
    case 'keyword_set':
      return parseSetStatement(state, startToken, trimLeft);
    case 'keyword_else':
    case 'keyword_elseif':
    case 'keyword_endif':
    case 'keyword_endfor':
      return reportUnexpectedTagKeyword(state, keywordToken);
    default:
      return reportUnknownTag(state, keywordToken);
  }
}

/**
 * Parse zero or more nodes until one of the supplied stop keywords is
 * encountered as the next tag keyword. Used to read `{% if %}` / `{% for %}`
 * bodies up to their terminator.
 */
export function parseBody(state: ParserState, stopKeywords: TokenType[]): ASTNode[] {
  const nodes: ASTNode[] = [];
  while (!isAtEnd(state)) {
    if (checkTagKeyword(state, ...stopKeywords)) break;
    const node = parseNode(state);
    if (node) nodes.push(node);
  }
  return nodes;
}
