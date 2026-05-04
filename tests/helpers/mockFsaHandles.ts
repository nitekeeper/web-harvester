// tests/helpers/mockFsaHandles.ts

import { vi } from 'vitest';

/**
 * Creates a mock writable stream that records anything written to it.
 * The accumulated content can be retrieved via `getWritten()`.
 */
function createMockWritable(): {
  write: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  getWritten: () => string;
} {
  let written = '';
  return {
    write: vi.fn().mockImplementation((text: string) => {
      written += text;
      return Promise.resolve();
    }),
    close: vi.fn().mockResolvedValue(undefined),
    getWritten: () => written,
  };
}

/**
 * Creates a mock file handle backed by an in-memory writable stream.
 * The underlying writable is exposed as `_writable` for assertions.
 */
function createMockFileHandle(name: string): {
  name: string;
  createWritable: ReturnType<typeof vi.fn>;
  _writable: ReturnType<typeof createMockWritable>;
} {
  const writable = createMockWritable();
  return {
    name,
    createWritable: vi.fn().mockResolvedValue(writable),
    _writable: writable,
  };
}

/**
 * Creates a mock `FileSystemDirectoryHandle` for unit tests.
 * Tracks created files in `_files`, exposes the permission and
 * file-handle vi.fn mocks so tests can override behavior.
 */
export function createMockDirHandle(): {
  name: string;
  getFileHandle: ReturnType<typeof vi.fn>;
  queryPermission: ReturnType<typeof vi.fn>;
  requestPermission: ReturnType<typeof vi.fn>;
  _files: Map<string, ReturnType<typeof createMockFileHandle>>;
} {
  const files = new Map<string, ReturnType<typeof createMockFileHandle>>();
  return {
    name: 'mock-dir',
    getFileHandle: vi.fn().mockImplementation((name: string, opts?: { create?: boolean }) => {
      if (!opts?.create && !files.has(name)) {
        return Promise.reject(new DOMException('File not found', 'NotFoundError'));
      }
      const handle = createMockFileHandle(name);
      files.set(name, handle);
      return Promise.resolve(handle);
    }),
    queryPermission: vi.fn().mockResolvedValue('granted'),
    requestPermission: vi.fn().mockResolvedValue('granted'),
    _files: files,
  };
}
