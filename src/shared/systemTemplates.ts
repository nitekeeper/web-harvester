// src/shared/systemTemplates.ts
//
// Built-in system templates and merge utility. Kept in shared/ so both the
// popup and settings pages can build the full template list without coupling
// to each other's internals.

import type { TemplateConfig } from './types';

/**
 * Presentation-layer view of a template. Adds `isSystem` so the list rail
 * and editor can treat built-in templates as read-only.
 */
export interface TemplateView extends TemplateConfig {
  readonly isSystem: boolean;
}

const SEEDED_BODY = `# {{page.title}}

> Clipped {{ now | date:"MMMM D, YYYY" }} from [{{page.domain}}]({{page.url}})

{{ content | markdown }}`;

const SEEDED_NOTE_NAME = '{{date}}-{{title|safe_name}}';

/**
 * Built-in templates shipped with the extension. These are never stored in
 * chrome.storage — they are always derived from source code. Readonly fields
 * and the `isSystem` flag prevent editing through the UI.
 */
export const SYSTEM_TEMPLATES: readonly TemplateView[] = [
  {
    id: 'sys-default-article',
    name: 'Default Article',
    isSystem: true,
    noteNameTemplate: SEEDED_NOTE_NAME,
    frontmatterTemplate:
      'title: {{page.title}}\nurl: {{page.url}}\nauthor: {{meta.author ?? "unknown"}}\npublished: {{page.published_date | date:"YYYY-MM-DD"}}\ntags: {{page.tags}}\nreadtime: {{page.reading_time}}',
    bodyTemplate: SEEDED_BODY,
  },
  {
    id: 'sys-quick-capture',
    name: 'Quick Capture',
    isSystem: true,
    noteNameTemplate: '{{date}}-{{title|safe_name}}',
    frontmatterTemplate:
      'title: {{page.title}}\nurl: {{page.url}}\ndate: {{now | date:"YYYY-MM-DD"}}',
    bodyTemplate: '{{content | markdown}}',
  },
  {
    id: 'sys-reference-citation',
    name: 'Reference / Citation',
    isSystem: true,
    noteNameTemplate: '{{date}}-ref-{{title|safe_name}}',
    frontmatterTemplate:
      'title: {{page.title}}\nurl: {{page.url}}\nauthor: {{meta.author}}\npublished: {{page.published_date}}\ntags: [reference]',
    bodyTemplate: `# {{page.title}}\n\n**Source:** {{page.url}}\n**Author:** {{meta.author}}\n\n## Summary\n\n{{content | markdown}}`,
  },
];

/**
 * Merges system templates (pinned first, sorted A–Z) with user templates
 * (appended after, also sorted A–Z) into a single `TemplateView[]`.
 */
export function mergeTemplates(userTemplates: readonly TemplateConfig[]): TemplateView[] {
  const systemSorted = [...SYSTEM_TEMPLATES].sort((a, b) => a.name.localeCompare(b.name));
  const userSorted = [...userTemplates]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t): TemplateView => ({ ...t, isSystem: false }));
  return [...systemSorted, ...userSorted];
}
