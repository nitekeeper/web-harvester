# ADR-001: Layered Clean Architecture

**Status:** Accepted  
**Date:** 2026-05-02

## Context

Web Harvester runs across four isolated browser contexts (popup, settings, side-panel, background service worker, content script), each with different lifetimes and access to different browser APIs. The codebase ports substantial logic from the upstream source (template engine, filters, content extraction) while replacing the storage and browser integration layers entirely. Without explicit layer boundaries, ported logic would accumulate browser-specific assumptions, and the browser integration code would bleed into testable business logic — making unit testing impossible without a real extension environment.

## Decision

The codebase is structured into five layers following Clean Architecture, with a strict one-direction dependency rule:

- `shared/` — zero dependencies; utility functions and constants available to all layers
- `domain/` — imports from `shared/` only; contains pure template engine, filters, content extraction, and all domain types and interfaces
- `application/` — imports from `domain/` and `shared/` only; depends on infrastructure interfaces, never concrete classes
- `infrastructure/` — imports from `domain/`, `application/`, and `shared/`; the only layer allowed to touch `chrome.*`, FSA, and IndexedDB
- `presentation/` — imports from `application/` and `shared/` only

An additional `core/` layer (micro-kernel: hooks, registry, container) imports from `shared/` only.

Import-direction violations are enforced statically by `eslint-plugin-import` circular-dependency and import-order rules, which block PRs on violation.

## Consequences

Pure domain and application logic can be unit-tested entirely in Node without browser globals — the `MockAdapter` stands in for every browser API. The infrastructure layer is tested separately with Tier 2 browser unit tests and Tier 3 E2E tests. Adding a Firefox or Safari adapter requires only a new `infrastructure/adapters/` implementation; no domain or application code changes. The tradeoff is that some orchestration code that could be co-located becomes more verbose due to interface indirection at layer boundaries.
