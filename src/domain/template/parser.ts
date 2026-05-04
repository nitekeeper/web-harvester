// Template parser for the Web Harvester template engine.
// Public entry point — re-exports types and the `parse`, `parseTokens`,
// `validateVariables`, and `formatAST` / `formatExpression` /
// `formatParserError` functions. Implementation is split across sibling
// modules to keep each file under the project's 400-line ceiling.
//
// The parser converts a token stream from `./tokenizer` into an Abstract
// Syntax Tree describing text, variable interpolations, and control-flow
// blocks (`if`, `for`, `set`).

import { tokenize, type Token } from '@domain/template/tokenizer';

import type { ParserState } from './parser-state';
import { parseTemplate } from './parser-statements';
import type { ASTNode, ParserError, ParserResult } from './parser-types';

export type {
  ASTNode,
  TextNode,
  VariableNode,
  IfNode,
  ForNode,
  SetNode,
  Expression,
  LiteralExpression,
  IdentifierExpression,
  BinaryExpression,
  UnaryExpression,
  FilterExpression,
  GroupExpression,
  MemberExpression,
  BaseNode,
  ParserError,
  ParserResult,
} from './parser-types';

export { formatAST, formatExpression, formatParserError } from './parser-format';
export { validateVariables, levenshteinDistance } from './parser-validate';

/**
 * Parse a template string into an AST. Tokenization errors are surfaced as
 * parser errors so callers see a single, unified error list.
 */
export function parse(input: string): ParserResult {
  const tokenizerResult = tokenize(input);

  const errors: ParserError[] = tokenizerResult.errors.map((e) => ({
    message: e.message,
    line: e.line,
    column: e.column,
  }));

  const state: ParserState = {
    tokens: tokenizerResult.tokens,
    pos: 0,
    errors,
  };

  const ast = parseTemplate(state);

  return { ast, errors: state.errors };
}

/**
 * Parse a pre-tokenized token stream into an AST. Useful when the caller
 * already has tokens (e.g. from caching or a custom tokenizer pipeline).
 */
export function parseTokens(tokens: Token[]): ParserResult {
  const state: ParserState = {
    tokens,
    pos: 0,
    errors: [],
  };

  const ast: ASTNode[] = parseTemplate(state);

  return { ast, errors: state.errors };
}
