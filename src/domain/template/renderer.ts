// Template renderer for the Web Harvester template engine.
// Evaluates an AST produced by `./parser` and produces string output.
//
// The renderer handles:
// - Variable interpolation with filters (delegated to `IFilterRegistry`)
// - Conditional logic (`if` / `elseif` / `else`)
// - Loops (`for`) with a Twig-compatible `loop` object
// - Variable assignment (`set`)
// - Whitespace control via `trimLeft` / `trimRight` markers
//
// Browser-specific helpers (selector resolution, `chrome.tabs` integration)
// live outside of `domain/` — this module is pure and synchronous-API-shaped
// even though it is async.

import type { IFilterRegistry } from '@domain/filters/index';
import {
  type ASTNode,
  type TextNode,
  type VariableNode,
  type IfNode,
  type ForNode,
  type SetNode,
  parse,
} from '@domain/template/parser';
import {
  evaluateExpression,
  isTruthy,
  valueToString,
  type RenderState,
} from '@domain/template/renderer-eval';
import { appendNodeOutput, trimLeadingWhitespace } from '@domain/template/renderer-whitespace';

// ============================================================================
// Public types
// ============================================================================

/**
 * Function type for resolving variables asynchronously (e.g. selectors that
 * need to query the active tab).
 */
export type AsyncResolver = (name: string, context: RenderContext) => Promise<unknown>;

/**
 * Context for rendering templates. Provides the variable bag, the URL of the
 * current page (used by URL-aware filters), an optional async resolver for
 * deferred variables, and the filter registry.
 */
export interface RenderContext {
  /** Variables available in the template. */
  variables: Record<string, unknown>;

  /** Current URL for URL-aware filter processing. */
  currentUrl: string;

  /** Tab ID for selector resolution (optional). */
  tabId?: number;

  /** Custom async resolver for special variable types (optional). */
  asyncResolver?: AsyncResolver;

  /** Filter registry used to apply named filters during rendering. */
  filterRegistry: IFilterRegistry;
}

/**
 * Options for the {@link render} function.
 */
export interface RenderOptions {
  /** Whether to trim whitespace from the final output. */
  trimOutput?: boolean;
}

/**
 * A non-fatal render error annotated with source position when available.
 */
export interface RenderError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Result of rendering a template.
 */
export interface RenderResult {
  output: string;
  errors: RenderError[];
  /**
   * True if output contains deferred variables that need post-processing
   * (e.g. unresolved selector placeholders).
   */
  hasDeferredVariables: boolean;
}

// ============================================================================
// Public render functions
// ============================================================================

/**
 * Render a template string with the given context.
 */
export async function render(
  template: string,
  context: RenderContext,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const parseResult = parse(template);

  if (parseResult.errors.length > 0) {
    return {
      output: '',
      errors: parseResult.errors.map((e) => ({
        message: e.message,
        line: e.line,
        column: e.column,
      })),
      hasDeferredVariables: false,
    };
  }

  return renderAST(parseResult.ast, context, options);
}

/**
 * Render an AST directly. Useful when the caller already has a parsed AST
 * and wants to skip re-parsing.
 */
export async function renderAST(
  ast: ASTNode[],
  context: RenderContext,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const errors: RenderError[] = [];
  const state: RenderState = {
    context,
    errors,
    pendingTrimRight: false,
    hasDeferredVariables: false,
  };

  let output = '';

  for (const node of ast) {
    const nodeOutput = await renderNode(node, state);
    output = appendNodeOutput(output, nodeOutput, node, state);
  }

  if (options.trimOutput) {
    output = output.trim();
  }

  return { output, errors, hasDeferredVariables: state.hasDeferredVariables };
}

// ============================================================================
// Node rendering
// ============================================================================

/* v8 ignore start */
function assertNever(node: never): never {
  throw new Error(`Unknown node type: ${JSON.stringify(node)}`);
}
/* v8 ignore stop */

async function renderNode(node: ASTNode, state: RenderState): Promise<string> {
  switch (node.type) {
    case 'text':
      return renderText(node, state);
    case 'variable':
      return renderVariable(node, state);
    case 'if':
      return renderIf(node, state);
    case 'for':
      return renderFor(node, state);
    case 'set':
      return renderSet(node, state);
    /* v8 ignore next 2 */
    default:
      return assertNever(node);
  }
}

function renderText(node: TextNode, state: RenderState): string {
  let text = node.value;

  // If a previous node had trimRight, trim leading whitespace and newlines.
  if (state.pendingTrimRight) {
    text = trimLeadingWhitespace(text);
    state.pendingTrimRight = false;
  }

  return text;
}

async function renderVariable(node: VariableNode, state: RenderState): Promise<string> {
  try {
    const value = await evaluateExpression(node.expression, state);
    const result = valueToString(value);

    /* v8 ignore next 3 — variable_end tokens are always emitted with trimRight:false */
    if (node.trimRight) {
      state.pendingTrimRight = true;
    }

    return result;
  } catch (error) {
    state.errors.push({
      message: `Error evaluating variable: ${String(error)}`,
      line: node.line,
      column: node.column,
    });
    return '';
  }
}

async function renderIf(node: IfNode, state: RenderState): Promise<string> {
  try {
    const conditionValue = await evaluateExpression(node.condition, state);

    if (isTruthy(conditionValue)) {
      const result = await renderNodes(node.consequent, state);
      if (node.trimRight) {
        state.pendingTrimRight = true;
      }
      return result;
    }

    for (const elseif of node.elseifs) {
      const elseifValue = await evaluateExpression(elseif.condition, state);
      if (isTruthy(elseifValue)) {
        return renderNodes(elseif.body, state);
      }
    }

    if (node.alternate) {
      return renderNodes(node.alternate, state);
    }

    if (node.trimRight) {
      state.pendingTrimRight = true;
    }

    return '';
  } catch (error) {
    state.errors.push({
      message: `Error evaluating if condition: ${String(error)}`,
      line: node.line,
      column: node.column,
    });
    return '';
  }
}

async function renderFor(node: ForNode, state: RenderState): Promise<string> {
  try {
    const iterableValue = await evaluateExpression(node.iterable, state);

    if (iterableValue === undefined || iterableValue === null) {
      if (node.trimRight) state.pendingTrimRight = true;
      return '';
    }

    const iterableArray = coerceIterable(iterableValue);
    if (!Array.isArray(iterableArray)) {
      state.errors.push({
        message: `For loop iterable is not an array: ${typeof iterableArray}`,
        line: node.line,
        column: node.column,
      });
      if (node.trimRight) state.pendingTrimRight = true;
      return '';
    }

    const results = await runForLoop(node, state, iterableArray);

    if (node.trimRight) state.pendingTrimRight = true;
    return results.join('\n');
  } catch (error) {
    state.errors.push({
      message: `Error in for loop: ${String(error)}`,
      line: node.line,
      column: node.column,
    });
    return '';
  }
}

/**
 * Coerce an iterable value into an array. JSON-string iterables are parsed
 * (matching the behaviour of the upstream `split` filter); anything else is
 * returned as-is for the caller to validate.
 */
function coerceIterable(iterable: unknown): unknown {
  if (Array.isArray(iterable)) return iterable;
  if (typeof iterable === 'string') {
    try {
      const parsed: unknown = JSON.parse(iterable);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not valid JSON, fall through.
    }
  }
  return iterable;
}

async function runForLoop(
  node: ForNode,
  state: RenderState,
  iterableArray: unknown[],
): Promise<string[]> {
  const results: string[] = [];
  const length = iterableArray.length;

  for (let i = 0; i < length; i++) {
    // eslint-disable-next-line security/detect-object-injection
    const item: unknown = iterableArray[i];

    const loop = {
      index: i + 1,
      index0: i,
      first: i === 0,
      last: i === length - 1,
      length,
    };

    const loopContext: RenderContext = {
      ...state.context,
      variables: {
        ...state.context.variables,
        [node.iterator]: item,
        [`${node.iterator}_index`]: i,
        loop,
      },
    };

    const loopState: RenderState = { ...state, context: loopContext };
    const itemResult = await renderNodes(node.body, loopState);
    results.push(itemResult.trim());
  }

  return results;
}

// `set` is a side-effecting statement that intentionally never emits text,
// so both branches return ''. The invariant return is by design.
// eslint-disable-next-line sonarjs/no-invariant-returns
async function renderSet(node: SetNode, state: RenderState): Promise<string> {
  try {
    const value = await evaluateExpression(node.value, state);

    // Set the variable in the context (mutates the context).
    Reflect.set(state.context.variables, node.variable, value);

    if (node.trimRight) {
      state.pendingTrimRight = true;
    }

    // Set produces no output.
    return '';
  } catch (error) {
    state.errors.push({
      message: `Error in set: ${String(error)}`,
      line: node.line,
      column: node.column,
    });
    return '';
  }
}

async function renderNodes(nodes: ASTNode[], state: RenderState): Promise<string> {
  let output = '';
  for (const node of nodes) {
    const nodeOutput = await renderNode(node, state);
    output = appendNodeOutput(output, nodeOutput, node, state);
  }
  return output;
}

// Re-export types from renderer-eval for consumers that need them.
export type { RenderState } from '@domain/template/renderer-eval';
