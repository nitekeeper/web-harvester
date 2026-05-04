# ADR-002: Micro-Kernel Plugin Architecture

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The original the upstream source grows new features by modifying core files — adding flags, branching on feature state, and coupling features directly to one another. This makes it increasingly difficult to add or remove features without risking regressions in unrelated code. Web Harvester must support a planned roadmap of future features (LLM/AI support, clip history, batch clipping) that were explicitly out of scope for v1, so the architecture needs to accommodate them without requiring core changes later.

## Decision

Every feature is implemented as a self-contained plugin implementing the `IPlugin` interface (`manifest`, `activate(context)`, `deactivate()`). The core — plugin registry, hook system, and DI container — is minimal and never modified to add features. This implements the Open/Closed Principle: the system is closed for modification, open for extension.

Each plugin receives an `IPluginContext` at activation time containing its scoped DI container, scoped logger, namespaced storage (`plugin:<id>:<key>`), hook system access, and UI registry. Plugins communicate only through the hook system — direct inter-plugin imports are prohibited. Plugin activation is wrapped in an error boundary so one failing plugin never crashes others. Failed plugins are tracked and surfaced in the settings debug panel.

The six built-in v1 plugins are: `ThemePlugin`, `ClipperPlugin`, `TemplatePlugin`, `HighlighterPlugin`, `ReaderPlugin`, and `SettingsPlugin`.

## Consequences

Adding a future feature (e.g. `LLMPlugin` for the `|prompt` filter) requires only a new plugin file and a registry entry — zero changes to existing code. Plugin isolation means a crashing plugin degrades gracefully. The tradeoff is that features that genuinely need tight integration must communicate through the hook system rather than calling each other directly, which adds a layer of indirection. Plugin storage namespacing prevents key collisions but requires an internal key index (`__keys`) so `clear()` can remove all entries without enumerating the entire storage.
