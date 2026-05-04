# ADR-007: Template Engine Three-Stage Pipeline

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The template engine is ported from the upstream source, which has a single large `parser.ts` file (1899 lines) that interleaves tokenization, parsing, and evaluation. The engine must support `{{variable|filter}}` interpolation, `{% if %}` / `{% for %}` / `{% set %}` control flow, whitespace-trimming markers, schema variable shorthand, and async variable resolution (for CSS-selector lookups that require a live tab). The engine is pure domain logic with no browser dependencies, so it must be testable entirely in Node.

## Decision

The template engine is structured as three distinct stages, each in its own module group:

1. **Tokenizer** (`src/domain/template/tokenizer*.ts`) — converts the raw template string into a flat token stream with source positions (line/column). Operates as a mode-driven dispatch loop (`text` / `variable` / `tag` modes). Non-fatal errors accumulate so callers see all problems at once; a best-effort token stream is always returned even when errors occur.

2. **Parser** (`src/domain/template/parser*.ts`) — converts the token stream into a typed AST (`TextNode`, `VariableNode`, `IfNode`, `ForNode`, `SetNode`). Expressions are modeled as a discriminated union (`LiteralExpression`, `IdentifierExpression`, `BinaryExpression`, `UnaryExpression`, `FilterExpression`, `GroupExpression`, `MemberExpression`). The `parse(input)` entry point also accepts pre-tokenized token streams via `parseTokens(tokens)`.

3. **Renderer** (`src/domain/template/renderer*.ts`) — walks the AST asynchronously, evaluating expressions against a `RenderContext` (variable bag, current URL, optional async resolver, filter registry). Filter application is delegated to the injected `IFilterRegistry` rather than called directly — this decouples the renderer from the filter implementation and allows the filter registry to be stubbed in tests.

Each stage is split across multiple files to respect the 400-line-per-file limit (the parser alone spans 10 files). Modules are re-exported through single public entry points (`tokenizer.ts`, `parser.ts`, `renderer.ts`).

## Consequences

Each stage can be tested in isolation: tokenizer tests verify the token stream, parser tests verify the AST shape, renderer tests verify string output with a mock filter registry. Pre-tokenized and pre-parsed inputs can be passed directly to later stages, enabling caching of parsed templates. The async renderer design ensures selector-based variables can be resolved against a live tab without blocking the UI. The tradeoff is that three import hops (`renderer` → `parser` → `tokenizer`) add a small amount of coordination overhead when debugging end-to-end template failures.
