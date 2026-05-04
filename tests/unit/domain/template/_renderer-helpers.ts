// tests/unit/domain/template/_renderer-helpers.ts
//
// Shared helpers for the split renderer coverage suites. Keeping these in
// one place avoids duplicating the `makeCtx` factory and prevents the
// coverage test files from each shipping their own copy.
import { createPopulatedFilterRegistry } from '@domain/filters/index';
import type { RenderContext } from '@domain/template/renderer';

/**
 * Construct a `RenderContext` populated with the full default filter
 * registry, URL, and the provided variables. Pass `overrides` to swap in a
 * custom filter registry or async resolver.
 */
export function makeCtx(
  vars: Record<string, unknown> = {},
  overrides: Partial<RenderContext> = {},
): RenderContext {
  return {
    variables: vars,
    currentUrl: 'https://example.com',
    filterRegistry: createPopulatedFilterRegistry(),
    ...overrides,
  };
}
