# ADR-010: Versioned Settings Migration with Backup/Restore

**Status:** Accepted  
**Date:** 2026-05-02

## Context

Extension settings evolve as features are added and schemas change. Users upgrade the extension and their stored settings must be migrated automatically — they cannot be asked to reconfigure manually. Migrations that corrupt data are especially harmful in an extension context because settings loss is invisible (no server-side backup) and can affect all stored destinations and templates. A migration system must be safe enough that partial failures leave the user recoverable.

## Decision

`createSettingsStorage()` in `src/infrastructure/storage/settings.ts` exposes a `runMigrations(migrations)` method that takes an ordered list of `IMigration` objects (`{ version, description, up }`). Migrations are filtered to only those with `version > currentVersion` and sorted ascending. For each pending migration: a backup is written to `chrome.storage.local` under `backup_v{version-1}` before `up()` is called; if `up()` throws, the backup is restored before re-throwing. Up to three backups are retained — older backups are pruned automatically.

Migrations run in the background service worker during `chrome.runtime.onInstalled`, blocking other startup until complete. `up()` functions must be pure (no side effects, no async, no storage calls) so they can be tested as plain functions. The result of every migration run is validated with a Zod schema before being written back to storage.

Settings reads always pass through a Zod schema via `storage.get(schema)` — if validation fails (due to schema drift not covered by a migration), defaults are returned with a warning rather than throwing.

## Consequences

Each migration is individually safe — a failure in step N restores the pre-N state, and subsequent sessions will retry only that migration. Three backups allow recovery from at most three consecutive migration failures. The pure-function requirement on `up()` makes migration logic trivially unit-testable. The Zod-validated read path provides a second safety net for schema drift. The tradeoff is the storage overhead of up to three backup copies and the requirement that every settings change increment a version and ship a migration.
