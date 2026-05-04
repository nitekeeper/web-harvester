# Template Renderer API

## Overview

The template renderer evaluates Jinja/Twig-style template strings into string output. It parses
the input into an AST, resolves variables (optionally asynchronously), applies filters, and
handles control flow (`if`, `elseif`, `else`, `for`, `set`). Callers supply a `RenderContext`
that carries the variable bag, the current URL, an optional async resolver for deferred variables
(such as CSS selector queries), and the filter registry.

Errors are non-fatal and accumulate in `RenderResult.errors` — rendering continues even when
individual nodes fail.

## Interface

### `render(template, context, options?): Promise<RenderResult>`

```typescript
async function render(
  template: string,
  context: RenderContext,
  options?: RenderOptions,
): Promise<RenderResult>;
```

Parses `template` and renders the resulting AST. If parsing fails, the parse errors are returned
immediately and no output is produced. On success, rendering proceeds and any per-node errors
accumulate in `result.errors`.

---

### `renderAST(ast, context, options?): Promise<RenderResult>`

```typescript
async function renderAST(
  ast: ASTNode[],
  context: RenderContext,
  options?: RenderOptions,
): Promise<RenderResult>;
```

Renders a pre-parsed `ASTNode[]` directly. Use this when the caller already holds a parsed AST
(e.g. from a cache) to avoid re-parsing.

---

### `RenderContext`

```typescript
interface RenderContext {
  variables: Record<string, unknown>;
  currentUrl: string;
  tabId?: number;
  asyncResolver?: AsyncResolver;
  filterRegistry: IFilterRegistry;
}
```

- `variables` — all template variables available for interpolation.
- `currentUrl` — used by URL-aware filters; required even if no such filters are used.
- `tabId` — passed to `asyncResolver` for selector queries that need a tab context.
- `asyncResolver` — called when a variable reference cannot be resolved synchronously.
  Signature: `(name: string, context: RenderContext) => Promise<unknown>`.
- `filterRegistry` — required; apply it from `createFilterRegistry()`.

---

### `RenderOptions`

```typescript
interface RenderOptions {
  trimOutput?: boolean; // default false
}
```

When `trimOutput` is `true`, leading and trailing whitespace is stripped from the final output
string before returning.

---

### `RenderResult`

```typescript
interface RenderResult {
  output: string;
  errors: RenderError[];
  hasDeferredVariables: boolean;
}
```

- `output` — the rendered string (empty string on fatal parse error).
- `errors` — accumulated non-fatal render errors with optional `line` / `column`.
- `hasDeferredVariables` — `true` if the output contains placeholder markers for variables that
  were not resolved during this render pass and require a follow-up resolution step.

---

### `AsyncResolver`

```typescript
type AsyncResolver = (name: string, context: RenderContext) => Promise<unknown>;
```

Optional callback for resolving variables that cannot be resolved synchronously (for example, a
`selector:` variable that needs to query the DOM of a live tab). Receive the variable name and
the full render context; return the resolved value.

## Usage Example

```typescript
import { render } from '@domain/template/renderer';
import { createFilterRegistry } from '@domain/filters';

const filterRegistry = createFilterRegistry();

const result = await render(
  'Hello, {{ name | upper }}! You are visiting {{ currentUrl }}.',
  {
    variables: { name: 'world' },
    currentUrl: 'https://example.com',
    filterRegistry,
  },
  { trimOutput: true },
);

console.log(result.output);
// → 'Hello, WORLD! You are visiting https://example.com.'

if (result.errors.length > 0) {
  for (const err of result.errors) {
    console.warn(`Render error at ${err.line}:${err.column} — ${err.message}`);
  }
}
```

## Notes

- `for` loop items each have access to a `loop` object: `{ index, index0, first, last, length }`.
- `for` loop iterables may be JSON-encoded array strings — the renderer will parse them.
- A `for` loop over `null` or `undefined` produces empty output without an error.
- `{% set name = value %}` mutates `context.variables` in place during rendering.
- If a template fails to parse entirely, `render` returns `{ output: '', errors: [...], hasDeferredVariables: false }` and does **not** call `renderAST`.
- `render` and `renderAST` are both async; always `await` the result.
