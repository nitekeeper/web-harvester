# Template Compiler API

## Overview

`compileTemplate()` is the high-level entry point for the Web Harvester template engine. It
composes the full pipeline — tokenizer → parser → renderer + filter registry — and splits the
rendered output into a YAML frontmatter block and a Markdown body.

Use `compileTemplate()` from the application layer. Use `render()` directly only when you
need to bypass frontmatter splitting or supply a custom filter registry.

Source: `src/domain/template/compiler.ts`  
Barrel export: `src/domain/template/index.ts`

---

## Types

### `TemplateVariables`

```typescript
interface TemplateVariables {
  title: string;
  url: string;
  content: string;
  date: string;
  description?: string;
  author?: string;
  image?: string;
  site?: string;
  tags?: string;
  [key: string]: string | undefined;
}
```

Variable bag passed to the template at compile time. The four required fields (`title`, `url`,
`content`, `date`) are always populated by the content extractor. All other fields are
optional and present only when the page exposes them.

---

### `CompileError`

```typescript
interface CompileError {
  message: string;
  line?: number;
  column?: number;
}
```

A single parse or render error. `line` and `column` are 1-based and present when the parser
can identify the source position of the error.

---

### `CompileResult`

```typescript
interface CompileResult {
  frontmatter: string;
  body: string;
  errors: CompileError[];
}
```

Result of compiling a template. `frontmatter` contains the YAML content between the opening
and closing `---` fences (without the fences themselves). `body` contains everything after
the frontmatter block, or the full rendered output when no frontmatter is present.

When `errors` is non-empty both `frontmatter` and `body` are empty strings.

---

## Functions

### `compileTemplate(template, variables): Promise<CompileResult>`

Renders `template` against `variables` and splits the output into frontmatter and body.

**Parameters**

| Parameter   | Type                | Description                                          |
| ----------- | ------------------- | ---------------------------------------------------- |
| `template`  | `string`            | Raw template string (may include `---` frontmatter). |
| `variables` | `TemplateVariables` | Variable bag for expression evaluation.              |

**Returns** `Promise<CompileResult>`

**Frontmatter detection**

Frontmatter is detected when the rendered output starts with a `---` line. The compiler
finds the closing `---` and splits there. If no valid frontmatter block is found the full
output is returned as `body` with `frontmatter: ''`.

**Error handling**

Errors are returned in `CompileResult.errors` rather than thrown. Callers decide how to
surface them (show a notification, log, skip the clip, etc.).

---

## Usage Example

```typescript
import { compileTemplate } from '@domain/template';

const template = `---
title: {{title}}
url: {{url}}
date: {{date|date:YYYY-MM-DD}}
---

{{content}}`;

const result = await compileTemplate(template, {
  title: 'My Article',
  url: 'https://example.com/article',
  content: '## Intro\n\nHello world.',
  date: new Date().toISOString(),
});

if (result.errors.length > 0) {
  console.error('Template errors:', result.errors);
} else {
  console.log(result.frontmatter);
  // → 'title: My Article\nurl: https://example.com/article\ndate: 2024-01-15'
  console.log(result.body);
  // → '## Intro\n\nHello world.'
}
```

---

## Notes

- `compileTemplate()` always uses `createPopulatedFilterRegistry()` — all 41 built-in filters
  are available in every template. See the [Filter Registry API](./filter-registry.md) for the
  full filter list.
- For lower-level access (custom filter registry, AST inspection), use `render()` and
  `renderAST()` from [Template Renderer API](./template-renderer.md) directly.
- The barrel export at `src/domain/template/index.ts` re-exports `compileTemplate` and its
  types alongside `render`, `renderAST`, `parse`, `tokenize`, and their types — import from
  `@domain/template` rather than the individual sub-module paths.
