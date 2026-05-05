// tests/unit/presentation/background/bridges.test.ts
import { describe, expect, it } from 'vitest';

import { compileTemplateForService } from '@presentation/background/bridges';

describe('compileTemplateForService — frontmatter delimiters', () => {
  it('wraps non-empty frontmatter with `---` fences and separates from body with a blank line', async () => {
    const template = '---\ntitle: {{title}}\n---\nBody {{title}}';
    const result = await compileTemplateForService(template, { title: 'Hello' });

    expect(result.ok).toBe(true);
    expect(result.output).toBe('---\ntitle: Hello\n---\n\nBody Hello');
  });

  it('starts the output with `---` so Obsidian recognises the YAML block', async () => {
    const template = '---\nkey: value\n---\nBody';
    const result = await compileTemplateForService(template, {});

    expect(result.output.startsWith('---\n')).toBe(true);
  });

  it('returns body alone (no `---` fences) when the template has no frontmatter', async () => {
    const template = 'Just a body, no fences.';
    const result = await compileTemplateForService(template, {});

    expect(result.ok).toBe(true);
    expect(result.output).toBe('Just a body, no fences.');
    expect(result.output.startsWith('---')).toBe(false);
  });

  it('coerces non-string variables to strings before rendering', async () => {
    const template = '{{count}}';
    const result = await compileTemplateForService(template, { count: 42 });

    expect(result.ok).toBe(true);
    expect(result.output).toBe('42');
  });
});
