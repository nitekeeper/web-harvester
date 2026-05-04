// Expression evaluation helpers for the template renderer.
// Split out of `./renderer` to keep each module under the 400-line ceiling.
//
// This module contains the expression evaluator, plain-identifier resolution,
// and the `contains` operator. Schema-specific lookup (shorthand, nested
// arrays, JSON parsing) lives in `./renderer-schema`. The `RenderState`
// shape shared between the renderer and the evaluator is exported here.

import type {
  Expression,
  IdentifierExpression,
  BinaryExpression,
  UnaryExpression,
  FilterExpression,
  MemberExpression,
} from '@domain/template/parser';
import type { RenderContext, RenderError } from '@domain/template/renderer';
import { getNestedValue, resolveSchemaVariable } from '@domain/template/renderer-schema';

// ============================================================================
// Render state
// ============================================================================

/**
 * Mutable state threaded through the renderer and the expression evaluator.
 */
export interface RenderState {
  context: RenderContext;
  errors: RenderError[];
  pendingTrimRight: boolean;
  /**
   * Tracks whether any deferred variables (unresolved `selector:` /
   * `selectorHtml:` references) were emitted during rendering.
   */
  hasDeferredVariables: boolean;
}

// ============================================================================
// Expression evaluator
// ============================================================================

/**
 * Evaluate an expression node against the current render state and return
 * the resulting value. Throws for unknown expression types so the caller can
 * surface a render error.
 */
export async function evaluateExpression(expr: Expression, state: RenderState): Promise<unknown> {
  switch (expr.type) {
    case 'literal':
      return expr.value;
    case 'identifier':
      return evaluateIdentifier(expr, state);
    case 'binary':
      return evaluateBinary(expr, state);
    case 'unary':
      return evaluateUnary(expr, state);
    case 'filter':
      return evaluateFilter(expr, state);
    case 'group':
      return evaluateExpression(expr.expression, state);
    case 'member':
      return evaluateMember(expr, state);
    /* v8 ignore next 4 — exhaustive switch; the parser never produces other types */
    default: {
      const exhaustive: never = expr;
      throw new Error(`Unknown expression type: ${JSON.stringify(exhaustive)}`);
    }
  }
}

async function evaluateIdentifier(
  expr: IdentifierExpression,
  state: RenderState,
): Promise<unknown> {
  const name = expr.name;

  // Check for special prefixes that need async resolution or post-processing.
  if (name.startsWith('selector:') || name.startsWith('selectorHtml:')) {
    if (state.context.asyncResolver) {
      return state.context.asyncResolver(name, state.context);
    }
    state.hasDeferredVariables = true;
    return `{{${name}}}`;
  }

  // Schema variables - resolved with shorthand support.
  if (name.startsWith('schema:')) {
    return resolveSchemaVariable(name, state.context.variables);
  }

  return resolveVariable(name, state.context.variables);
}

async function evaluateMember(expr: MemberExpression, state: RenderState): Promise<unknown> {
  const object = await evaluateExpression(expr.object, state);
  const property = await evaluateExpression(expr.property, state);

  if (object === undefined || object === null) {
    return undefined;
  }

  if (Array.isArray(object) && typeof property === 'number') {
    // eslint-disable-next-line security/detect-object-injection
    return object[property];
  }

  if (Array.isArray(object) && typeof property === 'string' && /^\d+$/.test(property)) {
    return object[parseInt(property, 10)];
  }

  if (typeof object === 'object' && property !== undefined) {
    return Reflect.get(object as object, String(property));
  }

  return undefined;
}

async function evaluateBinary(expr: BinaryExpression, state: RenderState): Promise<unknown> {
  // Nullish coalescing with short-circuit evaluation.
  if (expr.operator === '??') {
    const left = await evaluateExpression(expr.left, state);
    if (isTruthy(left)) {
      return left;
    }
    return evaluateExpression(expr.right, state);
  }

  const left = await evaluateExpression(expr.left, state);
  const right = await evaluateExpression(expr.right, state);

  switch (expr.operator) {
    case '==':
      return left == right;
    case '!=':
      return left != right;
    case '>':
      return compareGreater(left, right);
    case '<':
      return compareLess(left, right);
    case '>=':
      return compareGreaterEqual(left, right);
    case '<=':
      return compareLessEqual(left, right);
    case 'contains':
      return evaluateContains(left, right);
    case 'and':
      return isTruthy(left) && isTruthy(right);
    case 'or':
      return isTruthy(left) || isTruthy(right);
    /* v8 ignore next 2 — exhaustive switch; parser only emits known operators */
    default:
      throw new Error(`Unknown binary operator: ${expr.operator}`);
  }
}

function compareGreater(left: unknown, right: unknown): boolean {
  return (left as number | string) > (right as number | string);
}
function compareLess(left: unknown, right: unknown): boolean {
  return (left as number | string) < (right as number | string);
}
function compareGreaterEqual(left: unknown, right: unknown): boolean {
  return (left as number | string) >= (right as number | string);
}
function compareLessEqual(left: unknown, right: unknown): boolean {
  return (left as number | string) <= (right as number | string);
}

async function evaluateUnary(expr: UnaryExpression, state: RenderState): Promise<unknown> {
  const argument = await evaluateExpression(expr.argument, state);
  // The parser only ever emits `not` for unary expressions; any other
  // operator value is a parser bug.
  return !isTruthy(argument);
}

async function evaluateFilter(expr: FilterExpression, state: RenderState): Promise<unknown> {
  const value = await evaluateExpression(expr.value, state);

  const args: unknown[] = [];
  for (const arg of expr.args) {
    let argValue = await evaluateExpression(arg, state);
    // If a filter argument is an identifier that resolved to undefined,
    // treat it as a string literal (e.g. `date:YYYY-MM-DD`, `callout:info`).
    if (argValue === undefined && arg.type === 'identifier') {
      argValue = (arg as IdentifierExpression).name;
    }
    args.push(argValue);
  }

  const stringValue = valueToString(value);
  const stringArgs = args.map((a) => (typeof a === 'string' ? a : String(a)));
  return state.context.filterRegistry.apply(expr.name, stringValue, stringArgs);
}

function evaluateContains(left: unknown, right: unknown): boolean {
  if (left === undefined || left === null) return false;
  if (right === undefined || right === null) return false;

  if (Array.isArray(left)) {
    return left.some((item: unknown) => {
      if (typeof item === 'string' && typeof right === 'string') {
        return item.toLowerCase() === right.toLowerCase();
      }
      return item == right;
    });
  }

  if (typeof left === 'string') {
    const searchValue = typeof right === 'string' ? right : String(right);
    return left.toLowerCase().includes(searchValue.toLowerCase());
  }

  return false;
}

// ============================================================================
// Variable resolution
// ============================================================================

function resolveVariable(name: string, variables: Record<string, unknown>): unknown {
  const trimmed = name.trim();

  // Try with `{{ }}` wrapper first (how variables are stored).
  const wrappedKey = `{{${trimmed}}}`;
  if (Object.prototype.hasOwnProperty.call(variables, wrappedKey)) {
    const wrappedValue = Reflect.get(variables, wrappedKey);
    if (wrappedValue !== undefined) {
      return wrappedValue;
    }
  }

  // Try plain key (for locally `set` variables).
  if (Object.prototype.hasOwnProperty.call(variables, trimmed)) {
    const plain = Reflect.get(variables, trimmed);
    if (plain !== undefined) {
      return plain;
    }
  }

  // Handle nested property access: `author.name`.
  if (trimmed.includes('.')) {
    return getNestedValue(variables, trimmed);
  }

  return undefined;
}

// ============================================================================
// Utility predicates / converters
// ============================================================================

/**
 * Check if a value is "truthy" for template conditionals. Mirrors Twig
 * semantics: undefined/null/empty-string/0/false/empty-array are falsy.
 */
export function isTruthy(value: unknown): boolean {
  if (value === undefined || value === null || value === '' || value === 0 || value === false) {
    return false;
  }
  return !(Array.isArray(value) && value.length === 0);
}

/**
 * Convert any value to a string for output. Single-element arrays of
 * primitives unwrap to their element; objects serialise as JSON; null and
 * undefined render as empty strings.
 */
export function valueToString(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value) && value.length === 1 && typeof value[0] !== 'object') {
    return String(value[0]);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
