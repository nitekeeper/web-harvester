/// <reference types="vite/client" />

/** Vite environment variables available at runtime in the extension. */
interface ImportMetaEnv {
  /** Build stamp injected by CI, e.g. "2026.05.10-a7c93f1". Empty string in dev. */
  readonly VITE_BUILD?: string;
  /** Release channel: "stable" | "beta" | "dev". Defaults to "stable". */
  readonly VITE_CHANNEL?: string;
}
