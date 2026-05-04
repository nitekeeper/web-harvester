# File System Access API

## Overview

The FSA module is the only file in the project that uses the browser's File System Access API
directly. It provides two public functions: `ensureWritable` for verifying (and requesting)
`readwrite` permission on a directory handle, and `saveTo` for writing content to a file inside a
directory with configurable conflict resolution. Both are async and interact with the browser
permission layer.

## Interface

### `ensureWritable(handle: FileSystemDirectoryHandle): Promise<boolean>`

Checks whether `handle` already has `readwrite` permission. If not, prompts the user via
`requestPermission`. Returns `true` if permission is granted, `false` otherwise.

This function is called automatically by `saveTo`, so direct callers only need it for permission
pre-checks (e.g. showing a UI warning before attempting to write).

---

### `saveTo(dirHandle, fileName, content, strategy?): Promise<string>`

```typescript
async function saveTo(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
  strategy?: ConflictStrategy, // default: ConflictStrategy.Suffix
): Promise<string>;
```

Writes `content` to `fileName` inside `dirHandle`, applying the chosen conflict strategy if the
file already exists. Returns the actual filename written.

Throws `PermissionDeniedError` if `readwrite` permission cannot be obtained.

---

### `ConflictStrategy` (enum)

```typescript
enum ConflictStrategy {
  Overwrite = 'overwrite',
  Skip = 'skip',
  Suffix = 'suffix', // default
}
```

| Value       | Behaviour when file exists                     |
| ----------- | ---------------------------------------------- |
| `Overwrite` | Truncates and replaces the existing file.      |
| `Skip`      | Returns the existing filename without writing. |
| `Suffix`    | Writes to `<base>-1<ext>` (see notes).         |

---

### `PermissionDeniedError`

```typescript
class PermissionDeniedError extends Error {
  // message: `Permission denied for directory "<dirHandle.name>"`
}
```

Thrown by `saveTo` when `ensureWritable` returns `false`.

## Usage Example

```typescript
import { saveTo, ConflictStrategy, PermissionDeniedError } from '@infrastructure/fsa/fsa';

// Typical save flow
try {
  const writtenName = await saveTo(
    userPickedDirHandle,
    'My Note.md',
    '# Hello\n\nSaved from Web Harvester.',
    ConflictStrategy.Suffix,
  );
  console.log('wrote to', writtenName);
} catch (err) {
  if (err instanceof PermissionDeniedError) {
    // Show the user a permission-denied message
  } else {
    throw err;
  }
}

// Pre-check before showing a save dialog
const canWrite = await ensureWritable(userPickedDirHandle);
if (!canWrite) {
  showPermissionWarning();
}
```

## Notes

- `saveTo` internally calls `ensureWritable`; callers do not need to call it separately before
  calling `saveTo`.
- The `Suffix` strategy appends `-1` before the file extension (e.g. `note.md` → `note-1.md`).
  It only generates the `-1` suffix; if `note-1.md` also exists, the FSA API will silently
  truncate it because `getFileHandle({ create: true })` does not error on existing files.
- The `Skip` strategy returns the original `fileName` — not the handle to the existing file —
  and does not return the content currently stored there.
- Both `ensureWritable` and `saveTo` require a user gesture in some browser contexts for
  `requestPermission` to succeed. Calling them outside a user gesture may cause the permission
  request to be silently ignored.
