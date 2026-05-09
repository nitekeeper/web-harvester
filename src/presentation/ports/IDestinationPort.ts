// src/presentation/ports/IDestinationPort.ts
//
// Presentation-layer port interface for destination CRUD. Lets settings
// components depend on an abstraction instead of the infrastructure facade
// `IDestinationStorage` (which would violate the layer rule). The settings
// composition root has the ESLint carve-out (ADR-022) and assigns the
// concrete `IDestinationStorage` to this port via structural typing — the
// shapes are deliberately identical (`Destination` matches `DestinationView`
// field-for-field).

import type { DestinationView } from '@presentation/stores/useSettingsStore';

/**
 * CRUD facade over the persisted destinations store, expressed as a
 * presentation-layer abstraction so component code stays within the
 * `presentation -> application + shared` import surface.
 *
 * Conforming concrete implementations (e.g. the `IDestinationStorage`
 * returned by `createDestinationStorage` in infrastructure) are bound by
 * the settings composition root and exposed via React context.
 */
export interface IDestinationPort {
  /**
   * Persists a new destination with the supplied label and directory handle
   * and returns the saved record.
   */
  add(label: string, dirHandle: FileSystemDirectoryHandle): Promise<DestinationView>;
  /** Returns every persisted destination. */
  getAll(): Promise<DestinationView[]>;
  /**
   * Applies the supplied changes to an existing destination. If `id` does
   * not match a stored row, the call is a silent no-op.
   */
  update(
    id: string,
    changes: { label?: string; fileNamePattern?: string; lastUsed?: number },
  ): Promise<void>;
  /** Removes the destination identified by `id`. */
  remove(id: string): Promise<void>;
}
