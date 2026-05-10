import { describe, it, expect } from 'vitest';

import { flattenSchemaOrg, scanForSelectors } from '@domain/template/dynamicVariables';

const schemaTypeKey = 'schema:@Article:';
const bylineSelector = 'selector:.byline';

/**
 * Helper: creates a test variables dictionary
 */
function createVars(): Record<string, string> {
  return {};
}

describe('flattenSchemaOrg — null/undefined', () => {
  it('returns early for null input', () => {
    const vars = createVars();
    flattenSchemaOrg(null, vars);
    expect(vars).toEqual({});
  });

  it('returns early for undefined input', () => {
    const vars = createVars();
    flattenSchemaOrg(undefined, vars);
    expect(vars).toEqual({});
  });
});

describe('flattenSchemaOrg — object flattening', () => {
  it('flattens a simple @type object into schema: variables', () => {
    const vars = createVars();
    flattenSchemaOrg({ '@type': 'Article', author: 'Jane Doe', headline: 'Hello' }, vars);
    expect(vars[`${schemaTypeKey}author`]).toBe('Jane Doe');
    expect(vars[`${schemaTypeKey}headline`]).toBe('Hello');
  });

  it('skips @type and @context keys as variable names', () => {
    const vars = createVars();
    flattenSchemaOrg({ '@type': 'Article', '@context': 'https://schema.org', name: 'Test' }, vars);
    expect(Object.keys(vars).find((k) => k.includes('@context'))).toBeUndefined();
    expect(Object.keys(vars).find((k) => k.includes('@type'))).toBeUndefined();
  });

  it('converts numeric values to strings', () => {
    const vars = createVars();
    flattenSchemaOrg({ '@type': 'Product', price: 9.99 }, vars);
    expect(vars['schema:@Product:price']).toBe('9.99');
  });

  it('flattens a nested object with dot-separated keys', () => {
    const vars = createVars();
    flattenSchemaOrg({ '@type': 'Article', author: { name: 'John', '@type': 'Person' } }, vars);
    expect(vars[`${schemaTypeKey}author:name`]).toBe('John');
  });

  it('flattens an object without @type using bare key names', () => {
    const vars = createVars();
    flattenSchemaOrg({ name: 'bare value', count: 42 }, vars);
    expect(vars['schema:name']).toBe('bare value');
    expect(vars['schema:count']).toBe('42');
  });

  it('treats a non-string @type as absent (falls back to empty prefix)', () => {
    const vars = createVars();
    flattenSchemaOrg({ '@type': 123, name: 'typed-number' }, vars);
    expect(vars['schema:name']).toBe('typed-number');
  });
});

describe('flattenSchemaOrg — arrays', () => {
  it('flattens array fields with numeric indices', () => {
    const vars = createVars();
    flattenSchemaOrg({ '@type': 'Article', author: ['Alice', 'Bob'] }, vars);
    expect(vars[`${schemaTypeKey}author[0]`]).toBe('Alice');
    expect(vars[`${schemaTypeKey}author[1]`]).toBe('Bob');
  });

  it('handles an array of schema objects at the top level', () => {
    const vars = createVars();
    flattenSchemaOrg(
      [
        { '@type': 'Article', name: 'Post 1' },
        { '@type': 'Product', name: 'Widget' },
      ],
      vars,
    );
    expect(vars[`${schemaTypeKey}name`]).toBe('Post 1');
    expect(vars['schema:@Product:name']).toBe('Widget');
  });
});

describe('scanForSelectors', () => {
  it('returns empty array when no selector variables are present', () => {
    expect(scanForSelectors('{{title}} {{author}}')).toEqual([]);
  });

  it('extracts a single selector: expression', () => {
    expect(scanForSelectors(`{{${bylineSelector}}}`)).toEqual([bylineSelector]);
  });

  it('extracts a selectorHtml: expression', () => {
    expect(scanForSelectors('{{selectorHtml:article}}')).toEqual(['selectorHtml:article']);
  });

  it('extracts a selector with an attribute', () => {
    expect(scanForSelectors('{{selector:img?src}}')).toEqual(['selector:img?src']);
  });

  it('deduplicates repeated selector expressions', () => {
    const result = scanForSelectors(`{{${bylineSelector}}} {{${bylineSelector}}}`);
    expect(result).toEqual([bylineSelector]);
  });

  it('extracts multiple distinct selectors', () => {
    const result = scanForSelectors('{{selector:.title}} {{selectorHtml:.body}}');
    expect(result).toContain('selector:.title');
    expect(result).toContain('selectorHtml:.body');
    expect(result).toHaveLength(2);
  });

  it('ignores filter arguments that look like selectors', () => {
    expect(scanForSelectors('{{date|date:YYYY-MM-DD}}')).toEqual([]);
  });

  it('strips filter portion from selector expression', () => {
    expect(scanForSelectors(`{{${bylineSelector}|trim}}`)).toEqual([bylineSelector]);
  });
});
