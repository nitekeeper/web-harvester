## ADR-015: ESLint-Enforced Architectural Boundaries

**Status:** Accepted
**Date:** 2026-05-02

## Context

ADR-001 established the layered clean architecture and stated that import-direction violations would be enforced statically by `eslint-plugin-import`. The original scaffold configured `import/order` and `import/no-duplicates` only, leaving the actual layer boundaries unenforced — relying solely on developer discipline and code review. As the project crossed 13 implementation tasks, the gap became risky: a single accidental import from `domain/` into `infrastructure/` would silently invert the dependency direction and undermine the testability guarantees of ADR-001.

A second related issue surfaced while wiring this up. ADR-001 says the `core/` micro-kernel "imports from `shared/` only," but the actual `core/` modules (`container.ts`, `registry.ts`, `context.ts`) need three things to do their job:

- `IPlugin` and `IPluginContext` from `@domain/types` — `core/` orchestrates plugins, so it must speak the plugin contract.
- The nine `I*Adapter` interfaces from `@infrastructure/adapters/interfaces/` — the inversify container binds tokens to adapter contracts, which only exist in infrastructure.
- The `TYPES` token map from `@infrastructure/adapters/tokens` — same reason.

Three options were considered:

- **Option A — strict enforcement, refactor `core/`:** keep "shared only," move adapter interfaces and the `TYPES` token map into a new neutral location accessible to both `core/` and `infrastructure/`. Pros: matches the original ADR-001 text verbatim. Cons: requires inventing a fourth home for adapter contracts (neither domain nor infrastructure), which fragments the adapter pattern documented in ADR-005; large mechanical refactor of every consumer.
- **Option B — relax `core/` to the natural micro-kernel surface:** allow `core/` to import from `shared/`, `domain/` (types only), and `infrastructure/adapters/interfaces/` + `infrastructure/adapters/tokens`. Pros: matches the actual intent of a DI micro-kernel; no code motion; keeps adapter contracts co-located with adapter implementations. Cons: relaxes one rule from ADR-001.
- **Option C — leave the rules unenforced:** continue relying on review. Pros: no work. Cons: the whole point of ADR-001's enforcement claim is undermined; the boundaries that exist on paper are not the boundaries that exist in CI.

Option B was chosen. The refinement is small, narrowly scoped (interface/token imports only — never concrete infrastructure classes), and reflects the natural shape of a DI container.

## Decision

The boundary rules are now enforced in `eslint.config.ts` via `import/no-restricted-paths`, with the following allowed-target matrix per layer:

| Layer             | May import from                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `shared/`         | nothing in `src/`                                                                                     |
| `domain/`         | `shared/`                                                                                             |
| `application/`    | `domain/`, `shared/`                                                                                  |
| `presentation/`   | `application/`, `shared/`                                                                             |
| `infrastructure/` | `domain/`, `application/`, `shared/`                                                                  |
| `core/`           | `shared/`, `domain/` (types), `infrastructure/adapters/interfaces/`, `infrastructure/adapters/tokens` |
| `plugins/`        | `core/`, `domain/`, `application/`, `shared/`                                                         |

Two additional restrictions are enforced via `no-restricted-syntax`:

- `chrome.*` member expressions are banned everywhere except `src/infrastructure/adapters/chrome/ChromeAdapter.ts`.
- `console.*` calls are banned everywhere except `src/shared/logger.ts` (the scoped logger is the single sanctioned consumer).

Tests are excluded from these restrictions — `tests/` may import from any layer to construct fixtures.

## Consequences

ADR-001's stated enforcement is now real: a wrong-direction import fails `pnpm lint` with `--max-warnings 0`, blocking CI and pre-commit hooks. New plugins automatically inherit the correct dependency surface without authors needing to remember the rule. The relaxation of the `core/` rule is documented and bounded — `core/` cannot reach into infrastructure implementations or storage internals, only the interface contracts it needs to wire DI bindings. CLAUDE.md is updated to reflect the refined `core/` rule so that future contributors do not chase a phantom violation.
