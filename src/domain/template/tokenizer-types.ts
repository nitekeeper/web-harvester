// Template tokenizer — type definitions and constants
// Internal types used by the tokenizer modules. Public types are re-exported
// from `./tokenizer`.

/**
 * Discriminator for every token the tokenizer can emit.
 */
export type TokenType =
  // Structural tokens
  | 'text'
  | 'variable_start'
  | 'variable_end'
  | 'tag_start'
  | 'tag_end'
  // Keywords
  | 'keyword_if'
  | 'keyword_elseif'
  | 'keyword_else'
  | 'keyword_endif'
  | 'keyword_for'
  | 'keyword_in'
  | 'keyword_endfor'
  | 'keyword_set'
  // Operators
  | 'op_eq'
  | 'op_neq'
  | 'op_gte'
  | 'op_lte'
  | 'op_gt'
  | 'op_lt'
  | 'op_and'
  | 'op_or'
  | 'op_not'
  | 'op_contains'
  | 'op_nullish'
  | 'op_assign'
  // Literals and identifiers
  | 'identifier'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  // Punctuation
  | 'pipe'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'lbrace'
  | 'rbrace'
  | 'colon'
  | 'comma'
  | 'dot'
  | 'star'
  | 'slash'
  | 'arrow'
  | 'dollar'
  // Special
  | 'eof';

/**
 * A single token emitted by the tokenizer. Includes source position so the
 * parser can produce useful error messages.
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  /** For *_start tokens, whether to trim whitespace before the tag. */
  trimLeft?: boolean;
  /** For *_end tokens, whether to trim whitespace after the tag. */
  trimRight?: boolean;
}

/**
 * A non-fatal error encountered during tokenization. The tokenizer continues
 * past these so callers see all problems at once.
 */
export interface TokenizerError {
  message: string;
  line: number;
  column: number;
}

/**
 * Result of tokenizing a template — both the tokens produced and any errors
 * that surfaced. Tokens are emitted even when errors occur, so a best-effort
 * token stream is always available.
 */
export interface TokenizerResult {
  tokens: Token[];
  errors: TokenizerError[];
}

/**
 * Lexical mode the tokenizer is currently in. Drives the dispatch loop in
 * `tokenize`.
 */
export type TokenizerMode = 'text' | 'variable' | 'tag';

/**
 * Mutable bookkeeping carried through the recursive-descent tokenizer.
 * Internal — not exposed to consumers of the public API.
 */
export interface TokenizerState {
  input: string;
  pos: number;
  line: number;
  column: number;
  mode: TokenizerMode;
  tokens: Token[];
  errors: TokenizerError[];
}

const KEYWORDS_MAP: Readonly<Record<string, TokenType>> = Object.freeze({
  if: 'keyword_if',
  elseif: 'keyword_elseif',
  else: 'keyword_else',
  endif: 'keyword_endif',
  for: 'keyword_for',
  in: 'keyword_in',
  endfor: 'keyword_endfor',
  set: 'keyword_set',
  and: 'op_and',
  or: 'op_or',
  not: 'op_not',
  contains: 'op_contains',
  true: 'boolean',
  false: 'boolean',
  null: 'null',
});

/**
 * Resolve a lowercased identifier to its keyword token type, or undefined if
 * the identifier is not a reserved keyword. Guards against prototype-chain
 * lookups so adversarial input cannot resolve to inherited properties.
 */
export function lookupKeyword(value: string): TokenType | undefined {
  if (Object.prototype.hasOwnProperty.call(KEYWORDS_MAP, value)) {
    return KEYWORDS_MAP[value as keyof typeof KEYWORDS_MAP];
  }
  return undefined;
}
