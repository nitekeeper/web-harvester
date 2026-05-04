// src/domain/templates/defaultTemplate.ts
//
// Built-in default clip template used when the user has not created any
// custom templates. The shape (`TemplateConfig`) lives in `@shared/types` so
// every layer (domain, application, presentation) can reference it without a
// cross-layer import — see ADR-001.

import type { TemplateConfig } from '@shared/types';

/**
 * The application-wide default clip template. Returned by
 * `ITemplateService.getDefault()` when no user templates have been saved.
 *
 * The frontmatter records the three universally-available variables (`title`,
 * `url`, `date`); the body emits the extracted Markdown content unchanged;
 * the note name pattern formats the capture date and sanitizes the title via
 * the `safe_name` filter so the result is always a legal filename.
 */
export const DEFAULT_TEMPLATE: TemplateConfig = {
  id: 'default',
  name: 'Default',
  frontmatterTemplate: '---\ntitle: {{title}}\nurl: {{url}}\ndate: {{date}}\n---',
  bodyTemplate: '{{content}}',
  noteNameTemplate: '{{date|date:YYYY-MM-DD}} {{title|safe_name}}',
};
