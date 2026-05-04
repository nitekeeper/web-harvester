// tests/unit/infrastructure/fsa/fsa.test.ts

import { describe, it, expect, vi } from 'vitest';

import { ensureWritable, saveTo, ConflictStrategy } from '@infrastructure/fsa/fsa';

import { createMockDirHandle } from '../../../helpers/mockFsaHandles';

describe('ensureWritable', () => {
  it('returns true when permission is already granted', async () => {
    const handle = createMockDirHandle();
    const result = await ensureWritable(handle as unknown as FileSystemDirectoryHandle);
    expect(result).toBe(true);
  });

  it('requests permission when not yet granted', async () => {
    const handle = createMockDirHandle();
    handle.queryPermission.mockResolvedValue('prompt');
    handle.requestPermission.mockResolvedValue('granted');
    const result = await ensureWritable(handle as unknown as FileSystemDirectoryHandle);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    expect(result).toBe(true);
  });

  it('returns false when permission denied', async () => {
    const handle = createMockDirHandle();
    handle.queryPermission.mockResolvedValue('denied');
    handle.requestPermission.mockResolvedValue('denied');
    const result = await ensureWritable(handle as unknown as FileSystemDirectoryHandle);
    expect(result).toBe(false);
  });
});

describe('saveTo write behavior', () => {
  it('writes content to the directory', async () => {
    const handle = createMockDirHandle();
    await saveTo(
      handle as unknown as FileSystemDirectoryHandle,
      'note.md',
      '# Hello',
      ConflictStrategy.Overwrite,
    );
    const fileHandle = handle._files.get('note.md');
    expect(fileHandle).toBeDefined();
    if (!fileHandle) return;
    expect(fileHandle._writable.write).toHaveBeenCalledWith('# Hello');
    expect(fileHandle._writable.close).toHaveBeenCalled();
  });

  it('returns the same filename when strategy is Overwrite', async () => {
    const handle = createMockDirHandle();
    const result = await saveTo(
      handle as unknown as FileSystemDirectoryHandle,
      'note.md',
      '# Hello',
      ConflictStrategy.Overwrite,
    );
    expect(result).toBe('note.md');
  });
});

describe('saveTo conflict strategies', () => {
  it('appends suffix on conflict when strategy is Suffix', async () => {
    const handle = createMockDirHandle();
    // First getFileHandle call (checking existence) succeeds (file exists);
    // second call with suffix should also succeed.
    handle.getFileHandle
      .mockResolvedValueOnce({ name: 'note.md', createWritable: vi.fn() })
      .mockResolvedValueOnce({
        name: 'note-1.md',
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        }),
      });

    const fileName = await saveTo(
      handle as unknown as FileSystemDirectoryHandle,
      'note.md',
      '# Content',
      ConflictStrategy.Suffix,
    );
    expect(fileName).toBe('note-1.md');
  });

  it('skips write and returns existing filename when strategy is Skip and file exists', async () => {
    const handle = createMockDirHandle();
    // Simulate the file already existing on the first check.
    handle.getFileHandle.mockResolvedValueOnce({
      name: 'note.md',
      createWritable: vi.fn(),
    });
    const result = await saveTo(
      handle as unknown as FileSystemDirectoryHandle,
      'note.md',
      '# Hi',
      ConflictStrategy.Skip,
    );
    expect(result).toBe('note.md');
  });
});

describe('saveTo permission handling', () => {
  it('throws PermissionDeniedError when directory is not writable', async () => {
    const handle = createMockDirHandle();
    handle.queryPermission.mockResolvedValue('denied');
    handle.requestPermission.mockResolvedValue('denied');
    await expect(
      saveTo(
        handle as unknown as FileSystemDirectoryHandle,
        'note.md',
        '# Hi',
        ConflictStrategy.Overwrite,
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});
