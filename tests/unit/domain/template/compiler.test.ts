import { describe, test, expect } from 'vitest';

import { compileTemplate, type TemplateVariables } from '@domain/template/compiler';

const baseVars: TemplateVariables = {
  title: 'My Article',
  url: 'https://example.com/article',
  content: 'Article body text.',
  date: '2026-05-02',
};

describe('compileTemplate — body & frontmatter', () => {
  test('renders a plain template body', async () => {
    const result = await compileTemplate('# {{title}}', baseVars);
    expect(result.errors).toHaveLength(0);
    expect(result.body).toBe('# My Article');
    expect(result.frontmatter).toBe('');
  });

  test('splits frontmatter and body at --- separator', async () => {
    const template = `---
title: {{title}}
url: {{url}}
---
# {{title}}

{{content}}`;
    const result = await compileTemplate(template, baseVars);
    expect(result.errors).toHaveLength(0);
    expect(result.frontmatter).toContain('title: My Article');
    expect(result.frontmatter).toContain('url: https://example.com/article');
    expect(result.body).toContain('# My Article');
    expect(result.body).toContain('Article body text.');
  });

  test('returns frontmatter as empty string when no --- block exists', async () => {
    const result = await compileTemplate('no frontmatter here', baseVars);
    expect(result.frontmatter).toBe('');
    expect(result.body).toBe('no frontmatter here');
  });
});

describe('compileTemplate — variables', () => {
  test('renders optional variables when present', async () => {
    const vars: TemplateVariables = {
      ...baseVars,
      author: 'Alice',
      description: 'A great article',
    };
    const result = await compileTemplate('By {{author}}: {{description}}', vars);
    expect(result.body).toBe('By Alice: A great article');
  });

  test('renders optional variables as empty when absent', async () => {
    const result = await compileTemplate('By {{author}}', baseVars);
    expect(result.body).toBe('By ');
  });

  test('extra TemplateVariables fields are available as variables', async () => {
    const vars: TemplateVariables = { ...baseVars, site: 'Example Site' };
    const result = await compileTemplate('{{site}}', vars);
    expect(result.body).toBe('Example Site');
  });
});

describe('compileTemplate — directives', () => {
  test('handles template with filters', async () => {
    const result = await compileTemplate('{{title|upper}}', baseVars);
    expect(result.body).toBe('MY ARTICLE');
  });

  test('handles template with if/else', async () => {
    const template = '{% if author %}By {{author}}{% else %}Anonymous{% endif %}';
    const withAuthor = await compileTemplate(template, { ...baseVars, author: 'Bob' });
    const withoutAuthor = await compileTemplate(template, baseVars);
    expect(withAuthor.body).toContain('By Bob');
    expect(withoutAuthor.body).toContain('Anonymous');
  });

  test('handles template with for loop over tags', async () => {
    const vars: TemplateVariables = { ...baseVars, tags: 'tag1,tag2,tag3' };
    const template = '{% for tag in tags|split:"," %}{{tag}}{% endfor %}';
    const result = await compileTemplate(template, vars);
    expect(result.errors).toHaveLength(0);
    // The renderer joins each iteration's (trimmed) body with `\n`.
    expect(result.body).toBe('tag1\ntag2\ntag3');
  });

  test('handles date variable with date filter', async () => {
    const result = await compileTemplate('{{date|date:"YYYY"}}', baseVars);
    expect(result.errors).toHaveLength(0);
    expect(result.body).toBe('2026');
  });
});

describe('compileTemplate — error handling', () => {
  test('returns errors without throwing on malformed template', async () => {
    const result = await compileTemplate('{{unclosed', baseVars);
    expect(result.errors.length).toBeGreaterThan(0);
    // Does not throw
  });

  test('treats opening fence without closing fence as plain body', async () => {
    // No second `---` line means the output is not valid frontmatter; the
    // entire rendered text is returned as `body` and `frontmatter` stays empty.
    const result = await compileTemplate('---\ntitle: {{title}}\n', baseVars);
    expect(result.errors).toHaveLength(0);
    expect(result.frontmatter).toBe('');
    expect(result.body).toBe('---\ntitle: My Article\n');
  });
});

describe('@domain/template barrel', () => {
  test('re-exports compileTemplate from the barrel module', async () => {
    const barrel = await import('@domain/template/index');
    const result = await barrel.compileTemplate('{{title}}', baseVars);
    expect(result.body).toBe('My Article');
    expect(typeof barrel.render).toBe('function');
    expect(typeof barrel.parse).toBe('function');
    expect(typeof barrel.tokenize).toBe('function');
  });
});
