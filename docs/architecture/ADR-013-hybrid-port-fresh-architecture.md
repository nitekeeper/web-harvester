# ADR-013: Hybrid Architecture — Fresh Foundation, Ported Logic

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The the upstream source v1.6.2 codebase contains two categories of code: solved, well-tested logic (template engine, 50+ filters, content extractor, highlighter, reader mode, i18n) and architecture that must change entirely (storage layer, browser integration, plugin system, popup UI). A full rewrite risks reintroducing bugs in the solved parts. A pure fork risks inheriting architectural debt in the parts that need redesign.

Three approaches were evaluated:

- **Option A** (fork and patch): Modify the upstream source in place — fastest but the architectural debt is inescapable
- **Option B** (full rewrite): Rewrite everything — maximum control but re-solves already-solved problems
- **Option C** (hybrid): Write fresh architecture, port proven logic — the middle path

## Decision

Approach C was chosen. The following are written fresh: entry points, browser adapter layer, FSA storage layer, plugin system, hook system, DI container, popup UI structure, settings SPA. The following are ported from the upstream source: template engine and parser, all filters except `|prompt`, content extractor, DOM utilities, highlighter logic, reader mode logic, i18n structure and locale files.

The ported code is adapted to fit the clean architecture (browser API calls removed, `any` types eliminated, files split to respect the 400-line limit, imports updated to path aliases) but the core algorithms and test-proven logic are preserved.

## Consequences

The hardest, most bug-prone parts of the system (template parsing, filter implementations, content extraction) are inherited with their existing correctness rather than reimplemented. The architectural parts that needed redesign (browser abstraction, plugin system, storage) are built correctly from the start. The tradeoff is that ported code requires adaptation work (type cleanup, import rewriting, file splitting) and must be audited carefully to ensure browser-specific assumptions from the original are not silently carried over.
