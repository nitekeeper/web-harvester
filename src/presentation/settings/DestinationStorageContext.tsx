// src/presentation/settings/DestinationStorageContext.tsx
//
// React context that provides an `IDestinationPort` to the settings
// component tree. The settings composition root creates the concrete
// destination storage facade and wraps the React tree in
// `<DestinationStorageProvider storage={...}>` so hooks downstream
// (e.g. `useDestinationHandlers`) can pick it up via `useContext`.

import { createContext, type ReactNode } from 'react';

import type { IDestinationPort } from '@presentation/ports/IDestinationPort';

/**
 * Context handle for the destination storage port. `null` when no
 * provider is mounted (for example in a test that only mounts a section
 * without wiring storage); consumers must handle the absent case.
 */
export const DestinationStorageContext = createContext<IDestinationPort | null>(null);

/** Props for {@link DestinationStorageProvider}. */
interface DestinationStorageProviderProps {
  /** Concrete destination storage facade exposed to the subtree. */
  readonly storage: IDestinationPort;
  /** React subtree that will be able to read the storage handle. */
  readonly children: ReactNode;
}

/**
 * Wraps `children` with the {@link DestinationStorageContext} so descendant
 * components can read the destination storage facade. Mounted by the
 * settings composition root once per page load.
 */
export function DestinationStorageProvider({ storage, children }: DestinationStorageProviderProps) {
  return (
    <DestinationStorageContext.Provider value={storage}>
      {children}
    </DestinationStorageContext.Provider>
  );
}
