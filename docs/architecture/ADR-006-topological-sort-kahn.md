# ADR-006: Topological Sort for Plugin Dependency Resolution

**Status:** Accepted  
**Date:** 2026-05-02

## Context

Plugins declare dependencies on other plugins via `manifest.dependencies: string[]`. The registry must activate plugins in an order that guarantees every dependency is active before the plugin that requires it. Naive registration order cannot be relied upon. The algorithm must also detect circular dependencies, since a cycle would otherwise cause an infinite wait or silent failure at startup.

## Decision

Plugin activation order is resolved using Kahn's algorithm (BFS-based topological sort) implemented in `src/core/topology.ts`. The algorithm builds an in-degree map and an adjacency map from the plugin dependency graph, then iterates a queue of zero-in-degree nodes. If the result contains fewer nodes than the input, a cycle exists — `CircularDependencyError` is thrown with the remaining node IDs as the cycle description. Missing dependencies (a plugin declares a dependency on an ID that is not registered) throw a plain `Error` at graph-build time.

The sort operates on the minimum shape needed (`{ id, dependencies }`), keeping it independent of the full `IPlugin` interface and trivially testable with plain objects.

## Consequences

Activation order is deterministic and dependency-safe regardless of registration order. Cycle detection is guaranteed: a circular dependency fails loudly at startup rather than producing a stuck or partially-activated system. The tradeoff is that plugins with no dependencies between them have an arbitrary but stable ordering (determined by their registration order within the zero-in-degree set). The deactivation order is simply the activation order reversed, ensuring dependents are torn down before their dependencies.
