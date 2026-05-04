# ADR-005: Browser Adapter Pattern with Interface Segregation

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The extension must run on Chrome in v1 but be multi-browser-ready from day one — Firefox and Safari adapters must be addable later without changing any core logic. The `chrome.*` API surface is large and any code that touches it directly cannot be unit-tested in Node. The design must also make it obvious when new browser API usage is being introduced, since each new API represents a potential portability risk.

## Decision

All `chrome.*` API calls are confined to exactly one file: `src/infrastructure/adapters/chrome/ChromeAdapter.ts`. No other file in the project touches `chrome.*` directly — this is enforced by an ESLint rule and a hookify pre-commit hook.

The browser API surface is split into nine focused interfaces (Interface Segregation Principle), each covering a single concern: `ITabAdapter`, `IStorageAdapter`, `IRuntimeAdapter`, `INotificationAdapter`, `ICommandAdapter`, `IContextMenuAdapter`, `IActionAdapter`, `ISidePanelAdapter`, `IClipboardAdapter`. `ChromeAdapter` implements all nine as a single class — one instance, all nine behaviors — to minimize instantiation cost at startup.

The correct adapter is selected at build time: `pnpm build:chrome` bundles `ChromeAdapter`; future `pnpm build:firefox` would bundle `FirefoxAdapter`. All application and domain code depends only on the interfaces.

## Consequences

Domain and application unit tests inject a `MockAdapter` (in `tests/helpers/MockAdapter.ts`) that implements all nine interfaces with `vi.fn()` stubs — no browser process needed. Adding a Firefox adapter requires only a new file that implements the nine interfaces; no application or domain code changes. The tradeoff is that nine interfaces add some verbosity when binding the container, and a single `ChromeAdapter` class that implements all nine is a wide surface area for a single file — this is intentional and preferable to nine separate Chrome-specific files that would need to share `chrome.*` setup code.
