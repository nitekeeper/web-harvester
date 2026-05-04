# ADR-009: File System Access API for Direct File Writing

**Status:** Accepted  
**Date:** 2026-05-02

## Context

The upstream source saves files by constructing a proprietary URI scheme and opening it — the file is written by a third-party application, not the extension. This creates a hard runtime dependency on a third-party application being installed and running. Web Harvester's core design goal is to write files directly to the user's filesystem without any intermediary application. The File System Access API (available in Chrome 86+) allows extensions to obtain a `FileSystemDirectoryHandle` from the user via a picker, store it in IndexedDB for reuse, and write files directly to it.

## Decision

File writing is implemented in `src/infrastructure/fsa/fsa.ts` using two public functions: `ensureWritable(handle)` checks current permission and calls `requestPermission` if needed (returning `true` or `false`), and `saveTo(dirHandle, fileName, content, strategy)` writes content to a file in the given directory with a configurable `ConflictStrategy` (`Overwrite`, `Skip`, or `Suffix`). `PermissionDeniedError` is thrown when permission cannot be obtained, giving callers a typed error to present to the user.

The `Suffix` strategy (the default) appends `-1` before the extension when a filename conflict exists, matching the behavior users expect from OS "Save As" dialogs. FSA `FileSystemDirectoryHandle` objects are stored directly in IndexedDB (via `IDestinationStorage`) since IndexedDB is one of the few storage mechanisms that can hold structured cloneables including file system handles.

A TypeScript declaration file (`fsa-permissions.d.ts`) adds the `queryPermission`/`requestPermission` methods to `FileSystemDirectoryHandle`, since these are FSA Permission API extensions not present in the standard TypeScript DOM lib.

## Consequences

Files are written directly to the user's chosen folder with no dependency on any third-party application at runtime. The user is prompted for permission once per browser session (the permission is not persisted across sessions by the FSA spec). The `IDestinationStorage` abstraction wraps IndexedDB so that FSA handle storage can be swapped or tested independently. The tradeoff is that the Suffix conflict resolution only appends `-1` (not `-2`, `-3`, etc.) — the current implementation is documented to silently overwrite a file named `note-1.md` if one already exists. This is a known limitation to be revisited.
