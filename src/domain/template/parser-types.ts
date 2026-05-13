// Template parser — AST node types and result interfaces.
// Internal types used by the parser modules. Public types are re-exported
// from `./parser`.

/**
 * Common fields shared by every AST node — the discriminant `type` plus the
 * source position the node originated from.
 */
interface BaseNode {
  type: string;
  line: number;
  column: number;
}

/**
 * Plain text content between template tags.
 */
export interface TextNode extends BaseNode {
  type: 'text';
  value: string;
}

/**
 * A `{{ expression }}` interpolation. The wrapped expression may include
 * filters, operators, member access, etc.
 */
export interface VariableNode extends BaseNode {
  type: 'variable';
  expression: Expression;
  trimLeft: boolean;
  trimRight: boolean;
}

/**
 * An `{% if %} ... {% elseif %} ... {% else %} ... {% endif %}` block.
 * `alternate` is the optional `{% else %}` body, `null` when absent.
 */
export interface IfNode extends BaseNode {
  type: 'if';
  condition: Expression;
  consequent: ASTNode[];
  elseifs: { condition: Expression; body: ASTNode[] }[];
  alternate: ASTNode[] | null;
  trimLeft: boolean;
  trimRight: boolean;
}

/**
 * A `{% for iterator in iterable %} ... {% endfor %}` loop.
 */
export interface ForNode extends BaseNode {
  type: 'for';
  iterator: string;
  iterable: Expression;
  body: ASTNode[];
  trimLeft: boolean;
  trimRight: boolean;
}

/**
 * A `{% set variable = value %}` assignment that introduces a new template
 * variable bound to the result of an expression.
 */
export interface SetNode extends BaseNode {
  type: 'set';
  variable: string;
  value: Expression;
  trimLeft: boolean;
  trimRight: boolean;
}

/**
 * Discriminated union of every top-level AST node the parser produces.
 */
export type ASTNode = TextNode | VariableNode | IfNode | ForNode | SetNode;

/**
 * A literal value — string, number, boolean, or null. `raw` preserves the
 * exact source text, useful for round-tripping or reporting.
 */
export interface LiteralExpression extends BaseNode {
  type: 'literal';
  value: string | number | boolean | null;
  raw: string;
}

/**
 * A bare identifier reference (variable name, possibly with a prefix like
 * `selector:` or `schema:`).
 */
export interface IdentifierExpression extends BaseNode {
  type: 'identifier';
  name: string;
}

/**
 * A binary operation — comparison (`==`, `<`), boolean (`and`, `or`), or
 * nullish coalescing (`??`).
 */
export interface BinaryExpression extends BaseNode {
  type: 'binary';
  operator: string;
  left: Expression;
  right: Expression;
}

/**
 * A unary prefix operation, e.g. `not x` or `!x`.
 */
export interface UnaryExpression extends BaseNode {
  type: 'unary';
  operator: string;
  argument: Expression;
}

/**
 * A `value | filter:arg1,arg2` filter application. `value` is the input,
 * `name` is the filter identifier, `args` are the parsed argument list.
 */
export interface FilterExpression extends BaseNode {
  type: 'filter';
  value: Expression;
  name: string;
  args: Expression[];
}

/**
 * A parenthesised sub-expression — kept in the AST so the printer can
 * preserve grouping when round-tripping.
 */
export interface GroupExpression extends BaseNode {
  type: 'group';
  expression: Expression;
}

/**
 * Bracket-notation member access: `object[property]`. Always `computed: true`
 * since dot-notation is folded into `IdentifierExpression.name`.
 */
export interface MemberExpression extends BaseNode {
  type: 'member';
  object: Expression;
  property: Expression;
  computed: true;
}

/**
 * Discriminated union of every expression node the parser produces.
 */
export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | BinaryExpression
  | UnaryExpression
  | FilterExpression
  | GroupExpression
  | MemberExpression;

/**
 * A non-fatal parser error with source position. The parser continues past
 * these so callers see all problems at once.
 */
export interface ParserError {
  message: string;
  line: number;
  column: number;
}

/**
 * Result of parsing a template — the produced AST plus any errors that
 * surfaced. The AST is best-effort even when errors are present.
 */
export interface ParserResult {
  ast: ASTNode[];
  errors: ParserError[];
}
