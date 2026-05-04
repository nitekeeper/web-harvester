# ADR-011: IndexedDB for Destination Storage

**Status:** Accepted  
**Date:** 2026-05-02

## Context

Destinations store `FileSystemDirectoryHandle` objects alongside metadata (label, filename pattern, timestamps). `chrome.storage.local` cannot hold `FileSystemDirectoryHandle` objects because they are structured-cloneables not supported by the Chrome extension storage serialization format. `localStorage` has the same limitation. IndexedDB is the only browser storage mechanism that accepts structured-cloneables, making it the only viable choice for persisting FSA handles across sessions.

## Decision

`createDestinationStorage(idb?)` in `src/infrastructure/storage/destinations.ts` opens an IndexedDB database (`web-harvester`, version 1) with a single object store (`destinations`, keyed by `id`). The facade exposes five CRUD operations: `add`, `getAll`, `getById`, `update`, and `remove`. All IDB request/transaction wiring is wrapped in a small `tx()` helper that converts IDB request callbacks to Promises, keeping the public API fully async.

The `IDBFactory` is accepted as an optional constructor argument so tests can inject a `fake-indexeddb` instance without touching the global `indexedDB`. Each destination ID is generated with `crypto.randomUUID()` at insertion time.

## Consequences

FSA handles survive browser restarts and are reusable across sessions (subject to the user re-granting permission each session, as required by the FSA spec). The injected `IDBFactory` pattern makes the storage unit-testable without a browser process. The `IDestinationStorage` interface keeps the rest of the codebase independent of IndexedDB specifics. The tradeoff is that IndexedDB's callback API requires Promise wrapping boilerplate, and the single-store schema is simplistic — it cannot share a transaction with other object stores if needs expand.
