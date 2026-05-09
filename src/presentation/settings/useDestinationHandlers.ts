// src/presentation/settings/useDestinationHandlers.ts
//
// Hook that composes the FSA picker, the destination storage facade, and
// the global settings store into the four async handlers consumed by
// `DestinationsSection`. The storage facade is read from
// `DestinationStorageContext` so the settings composition root can plug it
// in once at boot time (see ADR-022).

import { useCallback, useContext } from 'react';

import type { IDestinationPort } from '@presentation/ports/IDestinationPort';
import { DestinationStorageContext } from '@presentation/settings/DestinationStorageContext';
import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { createLogger } from '@shared/logger';

const logger = createLogger('use-destination-handlers');

/**
 * Async handlers used by `DestinationsSection` — one each for the Add,
 * Remove, Rename, and SetPrimary flows. Every storage-mutating handler
 * refreshes the destinations slice in the global settings store afterward.
 */
export interface DestinationHandlers {
  /** Opens the FSA picker, persists the selection, refreshes the store. */
  onAdd: () => Promise<void>;
  /** Removes the destination identified by `id`, refreshes the store. */
  onRemove: (id: string) => Promise<void>;
  /** Renames the destination identified by `id` to `label`, refreshes the store. */
  onRename: (id: string, label: string) => Promise<void>;
  /** Sets the destination identified by `id` as the primary destination. */
  onSetPrimary: (id: string) => Promise<void>;
}

/**
 * Refreshes the `destinations` slice of the settings store from the supplied
 * storage facade. Extracted so the handlers below stay short and the
 * post-mutation reload step is named explicitly.
 */
async function refresh(storage: IDestinationPort): Promise<void> {
  const all = await storage.getAll();
  useSettingsStore.setState({ destinations: all });
}

/**
 * Opens the FSA directory picker (when available) and persists the user's
 * choice via the supplied storage facade, then refreshes the store. Logs and
 * returns a no-op result if the picker is not available in the host browser,
 * or if the user cancels the OS dialog (which surfaces as a `DOMException`
 * named `AbortError`). Any other rejection is re-thrown.
 */
async function pickAndAdd(storage: IDestinationPort): Promise<void> {
  const picker = Reflect.get(window, 'showDirectoryPicker') as
    | ((opts: { mode: 'readwrite' }) => Promise<FileSystemDirectoryHandle>)
    | undefined;
  if (!picker) {
    logger.warn('showDirectoryPicker is unavailable');
    return;
  }
  let dirHandle: FileSystemDirectoryHandle;
  try {
    dirHandle = await picker({ mode: 'readwrite' });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      logger.info('directory picker cancelled');
      return;
    }
    throw err;
  }
  await storage.add(dirHandle.name, dirHandle);
  await refresh(storage);
}

/**
 * Returns memoised destination handlers wired to the storage facade in
 * `DestinationStorageContext`. When no provider is mounted the storage-
 * dependent handlers log a warning and return without mutating state, so
 * render trees that do not need destination management stay safe to use.
 */
export function useDestinationHandlers(): DestinationHandlers {
  const storage = useContext(DestinationStorageContext);

  const onAdd = useCallback(async (): Promise<void> => {
    if (!storage) {
      logger.warn('onAdd called without DestinationStorageProvider');
      return;
    }
    await pickAndAdd(storage);
  }, [storage]);

  const onRemove = useCallback(
    async (id: string): Promise<void> => {
      if (!storage) {
        logger.warn('onRemove called without DestinationStorageProvider');
        return;
      }
      await storage.remove(id);
      await refresh(storage);
    },
    [storage],
  );

  const onRename = useCallback(
    async (id: string, label: string): Promise<void> => {
      if (!storage) {
        logger.warn('onRename called without DestinationStorageProvider');
        return;
      }
      await storage.update(id, { label });
      await refresh(storage);
    },
    [storage],
  );

  const onSetPrimary = useCallback(async (id: string): Promise<void> => {
    useSettingsStore.getState().updateSettings({ defaultDestinationId: id });
  }, []);

  return { onAdd, onRemove, onRename, onSetPrimary };
}
