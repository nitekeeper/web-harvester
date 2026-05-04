# ADR-017: Application Layer Port Interfaces

**Status:** Accepted  
**Date:** 2026-05-03

---

## Context

ADR-001 mandates that `application/` may only import from `domain/` and `shared/`. However,
application services need to interact with infrastructure adapters (e.g. `ITabAdapter`,
`IDestinationStorage`) and the hook system (`IHookSystem` from `@core/hooks`). A direct import
from `@core/` or `@infrastructure/` would violate the layer boundary and is rejected by the
ESLint `import/no-restricted-paths` rule.

A naive alternative — relaxing the boundary rule so `application/` can import from `@core/`
— would undermine the isolation that makes the application layer independently testable and
portable across runtimes.

---

## Decision

Each application service defines its own **local port interfaces** — minimal interface slices
that describe exactly the dependency surface the service needs. These are defined in the same
file as the service and are not shared across services.

**Example from `ClipService.ts`:**

```typescript
// Local port — mirrors the slice of ITabAdapter this service needs
interface ITabAdapterPort {
  getActiveTab(): Promise<Tab>;
  sendMessageToTab(tabId: number, message: unknown): Promise<unknown>;
}

// Local port — mirrors the slice of IHookSystem this service needs
interface IClipHooksPort {
  beforeClip: { call(content: ClipContent): Promise<ClipContent> };
  afterClip: { call(result: ClipResult): Promise<void> };
  beforeSave: { call(request: SaveRequest): Promise<boolean | undefined> };
  afterSave: { call(result: SaveResult): Promise<void> };
}
```

The service constructor accepts these port interfaces. At runtime the DI container provides
the real `ChromeAdapter` / `IHookSystem` implementations, which satisfy the port types
structurally (TypeScript uses structural typing). In tests, plain mock objects satisfy the
ports with no dependency on infrastructure or core packages.

Types that are shared across layers (e.g. `TemplateConfig`) are placed in `@shared/types`
rather than duplicated in each port file.

---

## Consequences

**Positive:**

- Application services remain independently testable — tests mock the ports with simple
  `vi.fn()` objects, requiring no infrastructure or browser API setup.
- The layer boundary enforced by ESLint is never violated.
- Services express their exact dependency surface (interface segregation): `ClipService`
  doesn't take a full `ITabAdapter`; it takes an `ITabAdapterPort` with two methods.
- Adding or changing infrastructure adapters does not ripple into application services as
  long as the port contract is preserved.

**Negative:**

- Type duplication risk: if the upstream infrastructure shape changes, the local port type
  silently diverges until a test or type-check failure surfaces the mismatch. Mitigated by
  TypeScript's structural typing — the compiler will catch shape mismatches at the injection
  site (the DI container binding).
- Slightly more boilerplate per service file.

---

## Applies to

- `src/application/ClipService.ts` — `ITabAdapterPort`, `IDestinationStoragePort`, `INotificationAdapterPort`, `IClipHooksPort`
- `src/application/SettingsService.ts` — `ISettingsStoragePort`, `ISettingsHooksPort`
- All future `src/application/` services that require infrastructure or core dependencies
