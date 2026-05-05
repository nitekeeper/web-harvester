// src/shared/defaultTemplate.ts

import type { TemplateConfig } from './types';

/**
 * The application-wide default clip template. Returned by
 * `ITemplateService.getDefault()` when no user templates have been saved,
 * and used as the store's initial template list so the UI is never empty on
 * first install.
 */
export const DEFAULT_TEMPLATE: TemplateConfig = {
  id: 'default',
  name: 'Default',
  frontmatterTemplate: '---\ntitle: {{title}}\nurl: {{url}}\ndate: {{date}}\n---',
  bodyTemplate: '{{content}}',
  noteNameTemplate: '{{date|date:YYYY-MM-DD}} {{title|safe_name}}',
};
