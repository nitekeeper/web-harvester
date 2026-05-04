# ADR-008: Pluggable Filter Registry Interface

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The template engine needs to apply named filters to values (e.g. `{{title|lower}}`, `{{date|date:YYYY-MM-DD}}`). The full filter suite (~50 filters) is being ported from the upstream source in a dedicated later task (Task 24). The `|prompt` filter is explicitly out of scope for v1 and will be added as a plugin. The renderer must not be blocked by the incomplete filter suite, and the filter implementation must not be hard-coupled to the renderer so that future filters can be added without modifying the renderer.

## Decision

The renderer depends on an `IFilterRegistry` interface rather than on a concrete filter implementation. The interface exposes a single method: `apply(filterName, value, args): string`. An unknown filter name returns the input value unchanged — this is a deliberate lenient default so templates using unimplemented filters degrade gracefully rather than erroring. `createFilterRegistry()` in `src/domain/filters/index.ts` returns the concrete registry; the current stub implements only `lower`, `upper`, and `trim` until the full suite lands in Task 24.

The `IFilterRegistry` lives in `domain/filters/` — filters are pure string transformations with no browser dependencies, making them domain logic rather than infrastructure.

## Consequences

The renderer, parser, and tokenizer all have 100% test coverage without requiring any filter implementations beyond the three-filter stub. Adding all 50+ filters in Task 24 requires no changes to the renderer or parser. A future `LLMPlugin` can extend the registry with a `|prompt` filter at activation time without touching core code. The tradeoff is that silently passing unknown filter names through unchanged can mask typos in templates — this is the same behavior as the upstream the upstream source, prioritizing template resilience over strictness.
