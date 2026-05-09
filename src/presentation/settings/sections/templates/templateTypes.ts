// src/presentation/settings/sections/templates/templateTypes.ts

import type { TemplateConfig } from '@shared/types';

/** A row in the frontmatter key/value grid. */
export interface FrontmatterRow {
  readonly key: string;
  readonly value: string;
}

/**
 * Presentation-layer view of a template. Adds `isSystem` so the list rail
 * and editor can treat built-in templates as read-only without touching the
 * storage-layer `TemplateConfig` shape.
 */
export interface TemplateView extends TemplateConfig {
  readonly isSystem: boolean;
}
