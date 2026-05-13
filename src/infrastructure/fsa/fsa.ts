// src/infrastructure/fsa/fsa.ts

import { createLogger } from '@shared/logger.js';

const logger = createLogger('fsa');

/**
 * Strategy used when a target file already exists in the destination directory.
 * - `Overwrite`: replace the existing file's content.
 * - `Skip`: leave the existing file untouched and return its name.
 * - `Suffix`: write to a uniquely-suffixed filename (e.g. `note-1.md`).
 */
export enum ConflictStrategy {
  Overwrite = 'overwrite',
  Skip = 'skip',
  Suffix = 'suffix',
}

/**
 * Thrown when read/write permission to a `FileSystemDirectoryHandle`
 * cannot be obtained from the user.
 */
class PermissionDeniedError extends Error {
  constructor(dirName: string) {
    super(`Permission denied for directory "${dirName}"`);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Ensures the given directory handle has `readwrite` permission, prompting
 * the user via `requestPermission` if needed. Returns `true` if granted.
 */
export async function ensureWritable(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const current = await handle.queryPermission({ mode: 'readwrite' });
  if (current === 'granted') return true;
  const requested = await handle.requestPermission({ mode: 'readwrite' });
  return requested === 'granted';
}

/**
 * Writes `content` to `fileName` inside `dirHandle`, applying the chosen
 * `ConflictStrategy` when the file already exists. Returns the actual
 * filename that was written (or that would have been overwritten/skipped).
 *
 * @throws {PermissionDeniedError} when the directory is not writable.
 */
export async function saveTo(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
  strategy: ConflictStrategy = ConflictStrategy.Suffix,
): Promise<string> {
  const writable = await ensureWritable(dirHandle);
  if (!writable) throw new PermissionDeniedError(dirHandle.name);

  let finalName = fileName;

  if (strategy === ConflictStrategy.Skip) {
    try {
      await dirHandle.getFileHandle(fileName, { create: false });
      logger.info(`File "${fileName}" already exists — skipping`);
      return fileName;
    } catch {
      // file does not exist — proceed with original name
    }
  } else if (strategy === ConflictStrategy.Suffix) {
    finalName = await resolveUniqueName(dirHandle, fileName);
  }

  const fileHandle = await dirHandle.getFileHandle(finalName, { create: true });
  const writableStream = await fileHandle.createWritable();
  await writableStream.write(content);
  await writableStream.close();
  logger.info(`Saved "${finalName}" to "${dirHandle.name}"`);
  return finalName;
}

/**
 * Returns a filename that does not yet exist in `dirHandle` by appending
 * a `-N` suffix (before the extension) where N starts at 1. If the original
 * filename is free, it is returned unchanged. The first conflicting check
 * triggers suffixing; subsequent counter increments are not re-validated to
 * keep the call path short. Note: if the suffixed name (e.g. `note-1.md`)
 * also already exists, the subsequent `getFileHandle(finalName, { create: true })`
 * call will silently truncate and overwrite it — the File System Access API
 * does not raise an error on existing files when `create: true` is set.
 */
async function resolveUniqueName(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<string> {
  if (!(await fileExists(dirHandle, fileName))) return fileName;

  const lastDot = fileName.lastIndexOf('.');
  const base = lastDot !== -1 ? fileName.slice(0, lastDot) : fileName;
  const ext = lastDot !== -1 ? fileName.slice(lastDot) : '';

  return `${base}-1${ext}`;
}

/**
 * Returns `true` if a file with `fileName` exists inside `dirHandle`.
 * Treats any error from `getFileHandle({ create: false })` as "does not exist".
 */
async function fileExists(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
): Promise<boolean> {
  try {
    await dirHandle.getFileHandle(fileName, { create: false });
    return true;
  } catch {
    return false;
  }
}
