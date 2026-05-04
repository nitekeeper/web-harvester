// src/infrastructure/fsa/fsa-permissions.d.ts
//
// Augments the standard `FileSystemHandle` lib.dom interface with the
// File System Access permissions extension (`queryPermission` /
// `requestPermission`), which TypeScript's built-in DOM lib does not yet
// model. See https://wicg.github.io/file-system-access/#permissions

export {};

declare global {
  /** Mode requested when querying or requesting handle permissions. */
  type FileSystemPermissionMode = 'read' | 'readwrite';

  /** Descriptor passed to `queryPermission` / `requestPermission`. */
  interface FileSystemHandlePermissionDescriptor {
    mode?: FileSystemPermissionMode;
  }

  /**
   * Adds the File System Access permissions extension methods missing
   * from TypeScript's bundled DOM lib.
   */
  interface FileSystemHandle {
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }
}
