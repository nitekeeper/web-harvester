// src/infrastructure/storage/destinations.ts

const DB_NAME = 'web-harvester';
const DB_VERSION = 1;
const STORE_NAME = 'destinations';

/**
 * A persisted destination folder selected by the user via the File System
 * Access API. The opaque `dirHandle` is stored directly in IndexedDB so that
 * subsequent saves can reuse it (subject to the user re-granting permission
 * on each browser session).
 */
export interface Destination {
  /** Stable identifier generated with `crypto.randomUUID()`. */
  readonly id: string;
  /** Human-friendly display name; not required to be unique. */
  readonly label: string;
  /** Opaque browser handle pointing at the user-selected directory. */
  readonly dirHandle: FileSystemDirectoryHandle;
  /** Filename pattern, e.g. `"{date} {title}.md"`. */
  readonly fileNamePattern: string;
  /** Unix milliseconds when the destination was first added. */
  readonly createdAt: number;
}

/**
 * CRUD facade over the IndexedDB-backed destinations object store.
 * All operations are asynchronous and resolve once the underlying
 * IDB request settles.
 */
export interface IDestinationStorage {
  /**
   * Persists a new destination and returns the saved record. If
   * `fileNamePattern` is omitted, a sensible default is used.
   */
  add(
    label: string,
    dirHandle: FileSystemDirectoryHandle,
    fileNamePattern?: string,
  ): Promise<Destination>;
  /** Returns every persisted destination. */
  getAll(): Promise<Destination[]>;
  /** Returns a destination by id, or `undefined` if no such id exists. */
  getById(id: string): Promise<Destination | undefined>;
  /**
   * Applies the given changes to an existing destination. If the id does
   * not match a stored row, the call is a silent no-op.
   */
  update(
    id: string,
    changes: Partial<Pick<Destination, 'label' | 'fileNamePattern'>>,
  ): Promise<void>;
  /** Deletes the destination with the given id. */
  remove(id: string): Promise<void>;
}

/**
 * Opens (and creates if needed) the destinations IndexedDB database.
 * Accepts an injected `IDBFactory` so tests can supply a fresh in-memory
 * instance from `fake-indexeddb`.
 */
function openDB(idb: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e): void => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e): void => {
      resolve((e.target as IDBOpenDBRequest).result);
    };
    req.onerror = (e): void => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Wraps an `IDBObjectStore` request in a Promise that resolves with the
 * request's result (or rejects with its error).
 */
function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_NAME, mode);
    const store = txn.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = (): void => {
      resolve(req.result);
    };
    req.onerror = (): void => {
      reject(req.error);
    };
  });
}

/**
 * Builds an `IDestinationStorage` bound to the given `IDBFactory`
 * (or the global `indexedDB` if omitted). The returned facade is
 * ready to use immediately — the underlying database has been opened
 * and the object store has been provisioned.
 */
export async function createDestinationStorage(idb?: IDBFactory): Promise<IDestinationStorage> {
  const db = await openDB(idb);

  return {
    async add(label, dirHandle, fileNamePattern = '{date} {title}.md'): Promise<Destination> {
      const dest: Destination = {
        id: crypto.randomUUID(),
        label,
        dirHandle,
        fileNamePattern,
        createdAt: Date.now(),
      };
      await tx(db, 'readwrite', (store) => store.add(dest));
      return dest;
    },

    async getAll(): Promise<Destination[]> {
      return tx<Destination[]>(db, 'readonly', (store) => store.getAll());
    },

    async getById(id): Promise<Destination | undefined> {
      return tx<Destination | undefined>(db, 'readonly', (store) => store.get(id));
    },

    async update(id, changes): Promise<void> {
      const existing = await tx<Destination | undefined>(db, 'readonly', (store) => store.get(id));
      if (!existing) return;
      await tx(db, 'readwrite', (store) => store.put({ ...existing, ...changes }));
    },

    async remove(id): Promise<void> {
      await tx(db, 'readwrite', (store) => store.delete(id));
    },
  };
}
