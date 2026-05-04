// tests/unit/infrastructure/storage/destinations.test.ts

import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  createDestinationStorage,
  type IDestinationStorage,
} from '@infrastructure/storage/destinations';

const LABEL_A = 'A';
const DEFAULT_PATTERN = '{date} {title}.md';

let storage: IDestinationStorage;

beforeEach(async () => {
  // Use a fresh IDB instance per test so stores never bleed between cases
  const freshIDB = new IDBFactory();
  storage = await createDestinationStorage(freshIDB);
});

describe('DestinationStorage add + getById', () => {
  it('adds a destination and retrieves it by id', async () => {
    const mockHandle = { name: 'Notes' } as unknown as FileSystemDirectoryHandle;
    const dest = await storage.add('My Notes', mockHandle, DEFAULT_PATTERN);

    expect(dest.id).toBeTruthy();
    expect(dest.label).toBe('My Notes');
    expect(dest.dirHandle).toBe(mockHandle);
    expect(dest.fileNamePattern).toBe(DEFAULT_PATTERN);
    expect(typeof dest.createdAt).toBe('number');

    const retrieved = await storage.getById(dest.id);
    expect(retrieved).toEqual(dest);
  });

  it('uses default fileNamePattern when none is supplied', async () => {
    const mockHandle = { name: LABEL_A } as unknown as FileSystemDirectoryHandle;
    const dest = await storage.add(LABEL_A, mockHandle);
    expect(dest.fileNamePattern).toBe(DEFAULT_PATTERN);
  });

  it('getById returns undefined for unknown id', async () => {
    const result = await storage.getById('does-not-exist');
    expect(result).toBeUndefined();
  });
});

describe('DestinationStorage getAll', () => {
  it('returns all destinations', async () => {
    const h1 = { name: LABEL_A } as unknown as FileSystemDirectoryHandle;
    const h2 = { name: 'B' } as unknown as FileSystemDirectoryHandle;
    await storage.add(LABEL_A, h1);
    await storage.add('B', h2);
    const all = await storage.getAll();
    expect(all).toHaveLength(2);
  });

  it('allows duplicate labels', async () => {
    const h1 = { name: LABEL_A } as unknown as FileSystemDirectoryHandle;
    const h2 = { name: 'B' } as unknown as FileSystemDirectoryHandle;
    await storage.add('Inbox', h1);
    await storage.add('Inbox', h2);
    const all = await storage.getAll();
    expect(all).toHaveLength(2);
    expect(all.every((d) => d.label === 'Inbox')).toBe(true);
  });
});

describe('DestinationStorage update + remove', () => {
  it('removes a destination by id', async () => {
    const h = { name: 'X' } as unknown as FileSystemDirectoryHandle;
    const dest = await storage.add('X', h);
    await storage.remove(dest.id);
    const retrieved = await storage.getById(dest.id);
    expect(retrieved).toBeUndefined();
  });

  it('updates label and fileNamePattern', async () => {
    const h = { name: 'Y' } as unknown as FileSystemDirectoryHandle;
    const dest = await storage.add('Old', h, 'old-pattern');
    await storage.update(dest.id, { label: 'New', fileNamePattern: 'new-pattern' });
    const updated = await storage.getById(dest.id);
    expect(updated?.label).toBe('New');
    expect(updated?.fileNamePattern).toBe('new-pattern');
  });

  it('update is a no-op when id does not exist', async () => {
    // Must not throw
    await expect(storage.update('nonexistent-id', { label: 'Ghost' })).resolves.toBeUndefined();
  });
});
