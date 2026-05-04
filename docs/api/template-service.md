# Template Service API

## Overview

`TemplateService` is the application-layer facade for the user's clip templates. It wraps an
underlying template storage port with simple CRUD operations and exposes a `render()` method that
composes the injected `compileTemplate` function with the `onTemplateRender` waterfall hook so
plugins can post-process the rendered output before it is returned to the caller.

It is distinct from `compileTemplate` in `@domain/template`:

- `compileTemplate` is a pure domain function that runs the tokenize → parse → render pipeline
  against a single template string and variable bag.
- `TemplateService` is the application service that owns the user's saved templates, fans out
  the `onTemplateRender` plugin hook, and exposes a typed CRUD surface to consumers.

The shared `TemplateConfig` shape is defined in `@shared/types` so every layer (domain,
application, presentation) can reference it without a cross-layer import — see ADR-001.

## Types

### `TemplateConfig`

Defined in `@shared/types` and reused across layers.

```typescript
interface TemplateConfig {
  readonly id: string;
  readonly name: string;
  readonly frontmatterTemplate: string;
  readonly bodyTemplate: string;
  readonly noteNameTemplate: string;
}
```

`id` is `'default'` for the built-in default; user templates use a UUID. `noteNameTemplate`
supports the same `{{variable|filter}}` expressions as `bodyTemplate` and is used to render the
saved file name.

---

### `TemplateVariables`

```typescript
type TemplateVariables = Record<string, unknown>;
```

Variable bag passed to a template at render time. Values are typically strings (URL, title,
content, date) but kept as `unknown` so callers can supply richer types without a cast.

---

### `CompileResult`

```typescript
interface CompileResult {
  readonly ok: boolean;
  readonly output: string;
  readonly errors: readonly unknown[];
}
```

Returned by `render()`. `output` is the final rendered string after the `onTemplateRender` hook
has run; `errors` is the raw error list from the injected `compileTemplate` function (untouched).

---

### `CompileTemplateFn`

```typescript
type CompileTemplateFn = (
  template: string,
  variables: TemplateVariables,
) => CompileResult | Promise<CompileResult>;
```

Function signature for the injected template compiler. Defined as a constructor parameter so the
service stays inside the application layer's allowed import surface.

---

### `DEFAULT_TEMPLATE`

The built-in default template returned by `getDefault()` when the user has not saved any
templates. Defined in `@domain/templates/defaultTemplate`.

```typescript
const DEFAULT_TEMPLATE: TemplateConfig = {
  id: 'default',
  name: 'Default',
  frontmatterTemplate: '---\ntitle: {{title}}\nurl: {{url}}\ndate: {{date}}\n---',
  bodyTemplate: '{{content}}',
  noteNameTemplate: '{{date|date:YYYY-MM-DD}} {{title|safe_name}}',
};
```

## Interface

### `ITemplateService`

```typescript
interface ITemplateService {
  getDefault(): Promise<TemplateConfig>;
  getAll(): Promise<TemplateConfig[]>;
  getById(id: string): Promise<TemplateConfig | undefined>;
  save(template: TemplateConfig): Promise<void>;
  remove(id: string): Promise<void>;
  render(id: string, variables: TemplateVariables): Promise<CompileResult>;
}
```

---

### `getDefault(): Promise<TemplateConfig>`

Returns the user's default template. When no templates are stored the built-in `DEFAULT_TEMPLATE`
is returned; otherwise the first stored template (insertion order) is treated as the default.

---

### `getAll(): Promise<TemplateConfig[]>`

Returns every persisted template in insertion order. Does not include `DEFAULT_TEMPLATE` — the
built-in default is only surfaced through `getDefault()` when storage is empty.

---

### `getById(id: string): Promise<TemplateConfig | undefined>`

Returns the template stored under `id`, or `undefined` when no template matches.

---

### `save(template: TemplateConfig): Promise<void>`

Persists `template` under its own `id`, overwriting any existing entry with the same id.

---

### `remove(id: string): Promise<void>`

Removes the template stored under `id`. A no-op when no template matches.

---

### `render(id: string, variables: TemplateVariables): Promise<CompileResult>`

Renders the template identified by `id` against `variables`. Steps:

1. Resolve the template — throws `TemplateNotFoundError` if missing.
2. Combine `frontmatterTemplate` + `bodyTemplate` into a single source string (frontmatter first,
   followed by a blank line, then the body — so the compiler can detect the YAML fence).
3. Invoke the injected `compileTemplate(source, variables)` and await its result.
4. Pass the rendered output through `hooks.onTemplateRender.call(output)` so plugin taps can
   transform it.
5. Return a `CompileResult` carrying the (possibly transformed) output and the compiler's error
   list unchanged.

---

### `TemplateNotFoundError`

Thrown by `render()` when the supplied template id does not match any persisted template.

```typescript
class TemplateNotFoundError extends Error {
  constructor(templateId: string);
}
```

The `name` is `'TemplateNotFoundError'`; the `message` is `Template "<id>" was not found`.

## Constructor

### `new TemplateService(storage, hooks, compileTemplate, logger?)`

```typescript
constructor(
  storage: ITemplateStoragePort,
  hooks: ITemplateHooksPort,
  compileTemplate: CompileTemplateFn,
  logger?: ILogger,
);
```

- **`storage: ITemplateStoragePort`** — the minimal subset of a template storage adapter that the
  service requires (`get`, `getAll`, `set`, `remove`). A typical `IPluginStorage`-shaped adapter
  satisfies this port.
- **`hooks: ITemplateHooksPort`** — port exposing `onTemplateRender.call(value)`. The application
  layer cannot import `@core/hooks` directly, so this local port mirrors the relevant slice of
  `IHookSystem`.
- **`compileTemplate: CompileTemplateFn`** — function matching `compileTemplate` from
  `@domain/template`. Injected rather than imported so this service stays trivially mockable in
  tests; the production wiring passes a thin adapter that adapts the domain compiler's
  `{frontmatter, body, errors}` shape to the application-level `{ok, output, errors}` shape.
- **`logger?: ILogger`** — optional scoped logger; defaults to `createLogger('TemplateService')`.

### Port shapes

```typescript
interface ITemplateStoragePort {
  get(key: string): Promise<TemplateConfig | undefined>;
  getAll(): Promise<TemplateConfig[]>;
  set(key: string, value: TemplateConfig): Promise<void>;
  remove(key: string): Promise<void>;
}

interface ITemplateHooksPort {
  readonly onTemplateRender: {
    call(value: string): Promise<string>;
  };
}
```

## Usage Example

```typescript
import { TemplateService } from '@application/TemplateService';
import { compileTemplate } from '@domain/template';
import { createHookSystem } from '@core/hooks';
import { createLogger } from '@shared/logger';

// Adapt the domain compiler's {frontmatter, body, errors} to the application
// service's {ok, output, errors} shape.
const compileFn = async (source, variables) => {
  const result = await compileTemplate(source, variables);
  const output =
    result.frontmatter.length > 0
      ? `---\n${result.frontmatter}\n---\n\n${result.body}`
      : result.body;
  return { ok: result.errors.length === 0, output, errors: result.errors };
};

const hooks = createHookSystem();
const service = new TemplateService(
  templateStorage, // satisfies ITemplateStoragePort
  hooks,
  compileFn,
  createLogger('templates'),
);

// Read the user's current default
const defaultTemplate = await service.getDefault();

// Render it against extracted variables
const result = await service.render(defaultTemplate.id, {
  title: 'My Article',
  url: 'https://example.com/article',
  content: '## Intro\n\nHello world.',
  date: new Date().toISOString(),
});

if (result.ok) {
  console.log(result.output);
} else {
  console.error('Template errors:', result.errors);
}
```

## Notes

- `getDefault()` does not persist `DEFAULT_TEMPLATE` — it only returns it when storage is empty.
  The first time a user explicitly saves the default, the saved copy supersedes the built-in.
- `render()` combines `frontmatterTemplate` and `bodyTemplate` with a blank-line separator. The
  underlying `compileTemplate` is responsible for parsing the YAML fence; this service does not
  inspect the source beyond concatenation.
- The `onTemplateRender` hook receives a single string (the rendered output) and returns a single
  string. Plugins that want richer access (e.g. variables, the template config) need to register
  for additional hooks instead.
- `noteNameTemplate` is not consumed by this service. Callers (typically `ClipService`) are
  responsible for rendering the note name separately — usually via the same `compileTemplate`
  function the service is constructed with.
- `TemplateConfig` lives in `@shared/types` so it can be referenced from any layer without
  triggering an `import/no-restricted-paths` violation.
