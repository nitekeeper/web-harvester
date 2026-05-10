/**
 * Shared data shapes used across domain, application, and presentation layers.
 * No imports — this file has no dependencies.
 */

/**
 * Configuration for a single clip template. Covers both the built-in default
 * and any user-created templates stored via `ITemplateStoragePort`.
 */
export interface TemplateConfig {
  /** Stable identifier. Built-in default uses `'default'`; user templates use a UUID. */
  readonly id: string;
  /** Human-readable display name shown in the popup template selector. */
  readonly name: string;
  /** YAML frontmatter template string, may contain `{{variable}}` expressions. */
  readonly frontmatterTemplate: string;
  /** Markdown body template string, may contain `{{variable}}` expressions. */
  readonly bodyTemplate: string;
  /** File name pattern, e.g. `'{{date|date:YYYY-MM-DD}} {{title|safe_name}}'`. */
  readonly noteNameTemplate: string;
}

/**
 * Presentation-layer view of the global application settings record. Shared
 * here so presentation stores (e.g. `useSettingsStore`) can type their state
 * without importing from `application/`. A superset of the runtime-validated
 * `AppSettings` produced by `SettingsService` — additional fields here are
 * optional or nullable so the structures stay structurally compatible.
 */
export interface AppSettings {
  /** Schema version of the persisted settings record. */
  readonly version: number;
  /** Active theme preference. */
  readonly theme: 'light' | 'dark' | 'system';
  /** BCP-47 locale tag used by the i18n layer. */
  readonly locale: string;
  /** Default destination id used when the user does not pick one explicitly. */
  readonly defaultDestinationId: string | null;
  /** Default template id used when the user does not pick one explicitly. */
  readonly defaultTemplateId: string | null;
}

/**
 * Shape of one entry in Defuddle's metaTags array — a parsed `<meta>` element.
 */
export interface MetaTag {
  readonly name?: string | null;
  readonly property?: string | null;
  readonly content: string | null;
}
