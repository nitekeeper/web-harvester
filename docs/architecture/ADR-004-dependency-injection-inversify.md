# ADR-004: Dependency Injection with InversifyJS

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The application has a plugin-based architecture where each plugin needs scoped access to a subset of infrastructure services, and where plugin lifecycle (activate/deactivate) should automatically clean up scoped dependencies. The DI library needs to support hierarchical containers — a root container for shared infrastructure, and child containers per plugin. Two candidates were evaluated: `tsyringe` (lightweight, decorator-based) and `inversify` (heavier, but with hierarchical containers, middleware/interceptors, and snapshot/restore testing support).

## Decision

InversifyJS (`inversify@^6`) is used as the DI library. `createRootContainer(adapters)` binds all nine browser adapter interfaces as singletons under `Symbol.for(...)` tokens defined in `infrastructure/adapters/tokens.ts`. `createPluginContainer(parent)` creates a child container with `Transient` default scope whose parent is the root container — child bindings don't leak to the parent, but the child can resolve any root binding. Plugin containers are disposed when the plugin deactivates, cleaning up all plugin-scoped dependencies automatically.

Adapter instances are pre-constructed and passed into `createRootContainer` via an `AdapterBindings` record rather than being constructed by the container itself. This avoids decorator-based construction on the adapter classes, which must remain plain classes for Tier 2 browser testing.

`reflect-metadata` is imported as the first import in all five presentation entry points to satisfy InversifyJS's metadata requirements.

## Consequences

Plugin scoping is automatic — a plugin's child container and all transient bindings it declares are collected when the container is disposed. The `TYPES` symbol map provides a central registry of all injectable tokens, preventing string typos. The tradeoff is InversifyJS's verbosity compared to `tsyringe`: bindings require explicit `Symbol.for` tokens and the `reflect-metadata` side-effect import at every entry point. The `emitDecoratorMetadata` and `experimentalDecorators` tsconfig flags are required.
