// tests/unit/domain/template/renderer.resolution.test.ts
//
// Coverage tests for variable resolution: nested-property access, member
// expressions, schema variables (including shorthand and nested arrays),
// and deferred prompt / selector variables.
import { describe, test, expect } from 'vitest';

import { render } from '@domain/template/renderer';

import { makeCtx } from './_renderer-helpers';

describe('render — variable resolution', () => {
  test('resolves variables stored with {{ }} wrapper', async () => {
    const result = await render('{{title}}', makeCtx({ '{{title}}': 'Wrapped' }));
    expect(result.output).toBe('Wrapped');
  });

  test('resolves nested property access via dot notation', async () => {
    const result = await render('{{author.name}}', makeCtx({ author: { name: 'Ada' } }));
    expect(result.output).toBe('Ada');
  });

  test('resolves nested property when intermediate uses wrapped key', async () => {
    const result = await render('{{author.name}}', makeCtx({ author: { '{{name}}': 'Wrapped' } }));
    expect(result.output).toBe('Wrapped');
  });

  test('returns empty for nested access through non-object', async () => {
    const result = await render('{{a.b.c}}', makeCtx({ a: { b: 'string' } }));
    expect(result.output).toBe('');
  });

  test('returns empty for nested access through null', async () => {
    const result = await render('{{a.b.c}}', makeCtx({ a: null }));
    expect(result.output).toBe('');
  });

  test('resolves bracket notation against an array', async () => {
    const result = await render('{{items[0]}}', makeCtx({ items: ['first', 'second'] }));
    expect(result.output).toBe('first');
  });

  test('resolves bracket notation against an object key', async () => {
    const result = await render('{{obj["foo"]}}', makeCtx({ obj: { foo: 'bar' } }));
    expect(result.output).toBe('bar');
  });

  test('returns empty for bracket notation against primitives', async () => {
    const result = await render('{{items[0]}}', makeCtx({ items: 'not-an-object' }));
    expect(result.output).toBe('');
  });
});

describe('render — member expression evaluation', () => {
  test('numeric member access on array', async () => {
    const result = await render('{% set arr = items %}{{arr[0]}}', makeCtx({ items: ['x', 'y'] }));
    expect(result.output).toBe('x');
  });

  test('member access through null returns empty', async () => {
    const result = await render('{% set m = nothing %}{{m[0]}}', makeCtx({ nothing: null }));
    expect(result.output).toBe('');
  });

  test('treats string-numeric member access as array index', async () => {
    const result = await render(
      '{% set i = "0" %}{{items[i]}}',
      makeCtx({ items: ['hit', 'miss'] }),
    );
    expect(result.output).toBe('hit');
  });
});

const GENRE_TPL = '{{schema:genre}}';

describe('render — schema variables: key resolution', () => {
  test('resolves schema variable with plain key', async () => {
    const result = await render(GENRE_TPL, makeCtx({ 'schema:genre': 'Drama' }));
    expect(result.output).toBe('Drama');
  });

  test('resolves schema variable with wrapped key', async () => {
    const result = await render(GENRE_TPL, makeCtx({ '{{schema:genre}}': 'Comedy' }));
    expect(result.output).toBe('Comedy');
  });

  test('resolves schema variable using shorthand', async () => {
    // Shorthand resolution searches for any stored key that ends with
    // `:${schemaKey}}}` — e.g. `{{schema:@Movie:genre}}` matches `schema:genre`.
    const result = await render(GENRE_TPL, makeCtx({ '{{schema:@Movie:genre}}': 'Sci-Fi' }));
    expect(result.output).toBe('Sci-Fi');
  });

  test('returns empty for unknown schema variable', async () => {
    const result = await render('{{schema:unknown}}', makeCtx());
    expect(result.output).toBe('');
  });
});

describe('render — schema variables: JSON-encoded values', () => {
  test('parses JSON-encoded schema arrays', async () => {
    const result = await render('{{schema:tags}}', makeCtx({ 'schema:tags': '["a","b"]' }));
    expect(result.output).toBe('["a","b"]');
  });

  test('parses JSON-encoded schema objects', async () => {
    const result = await render('{{schema:meta}}', makeCtx({ 'schema:meta': '{"a":1}' }));
    expect(result.output).toBe('{"a":1}');
  });

  test('returns string when JSON parse fails', async () => {
    const result = await render('{{schema:meta}}', makeCtx({ 'schema:meta': '[not json' }));
    expect(result.output).toBe('[not json');
  });
});

describe('render — schema variables: array access', () => {
  const CAST = '[{"name":"Ada"},{"name":"Bea"}]';

  test('schema array index access', async () => {
    const result = await render('{{schema:cast[0]}}', makeCtx({ 'schema:cast': CAST }));
    expect(result.output).toBe('{"name":"Ada"}');
  });

  test('schema array index with property path', async () => {
    const result = await render('{{schema:cast[0].name}}', makeCtx({ 'schema:cast': CAST }));
    expect(result.output).toBe('Ada');
  });

  test('schema array star with property path', async () => {
    const result = await render('{{schema:cast[*].name}}', makeCtx({ 'schema:cast': CAST }));
    expect(result.output).toBe('["Ada","Bea"]');
  });

  test('schema array star without property path returns all items', async () => {
    const result = await render('{{schema:cast[*]}}', makeCtx({ 'schema:cast': CAST }));
    expect(result.output).toBe(`${CAST}`);
  });

  test('schema array with out-of-bounds index returns empty', async () => {
    const result = await render(
      '{{schema:cast[5]}}',
      makeCtx({ 'schema:cast': '[{"name":"Ada"}]' }),
    );
    expect(result.output).toBe('');
  });

  test('schema array against non-array value returns empty', async () => {
    const result = await render('{{schema:cast[0]}}', makeCtx({ 'schema:cast': 'plain string' }));
    expect(result.output).toBe('');
  });

  test('schema array against missing key returns empty', async () => {
    const result = await render('{{schema:missing[0]}}', makeCtx());
    expect(result.output).toBe('');
  });
});

describe('render — schema variables: malformed array key fallthrough', () => {
  test('falls through when schema key has only opening bracket', async () => {
    const result = await render('{{schema:foo[}}', makeCtx({ 'schema:foo[': 'bar' }));
    expect(result.output).toBe('bar');
  });

  test('falls through when bracket index is non-numeric and not star', async () => {
    const result = await render('{{schema:foo[abc]}}', makeCtx({ 'schema:foo[abc]': 'bar' }));
    expect(result.output).toBe('bar');
  });

  test('falls through when bracket has trailing garbage', async () => {
    const result = await render('{{schema:foo[0]bad}}', makeCtx({ 'schema:foo[0]bad': 'baz' }));
    expect(result.output).toBe('baz');
  });
});

describe('render — schema property paths: bracket access', () => {
  test('resolves bracket-array index inside schema property path', async () => {
    const result = await render(
      '{{schema:cast[*].roles[0]}}',
      makeCtx({
        'schema:cast': '[{"roles":["lead","villain"]},{"roles":["sidekick"]}]',
      }),
    );
    expect(result.output).toBe('["lead","sidekick"]');
  });

  test('resolves bracket-object key inside schema property path', async () => {
    const result = await render(
      '{{schema:items[*].meta["foo"]}}',
      makeCtx({
        'schema:items': '[{"meta":{"foo":"a"}},{"meta":{"foo":"b"}}]',
      }),
    );
    expect(result.output).toBe('["a","b"]');
  });

  test('handles bare-bracket path segment', async () => {
    // propertyPath `[0]` makes the bracket regex match with an empty arrayKey,
    // exercising the `arrayKey ? ... : value` fallback in resolveBracketKey.
    const result = await render(
      '{{schema:items[*].[0]}}',
      makeCtx({ 'schema:items': '[["a","b"],["c","d"]]' }),
    );
    expect(result.output).toBe('["a","c"]');
  });
});

describe('render — schema property paths: filtering nulls', () => {
  test('returns empty array when bracket base is a primitive inside property path', async () => {
    const result = await render(
      '{{schema:items[*].meta[0]}}',
      makeCtx({ 'schema:items': '[{"meta":42}]' }),
    );
    // Primitive `meta` can't be indexed; the lone item resolves to undefined
    // and is filtered out, leaving `[]`.
    expect(result.output).toBe('[]');
  });

  test('skips null items when iterating schema property paths', async () => {
    const result = await render(
      '{{schema:items[*].name}}',
      makeCtx({ 'schema:items': '[null,{"name":"Bea"}]' }),
    );
    expect(result.output).toBe('Bea');
  });

  test('drops out-of-range items inside property paths', async () => {
    // First item's `roles[0]` is undefined (empty array) and is filtered.
    const result = await render(
      '{{schema:items[*].roles[0]}}',
      makeCtx({ 'schema:items': '[{"roles":[]},{"roles":["x"]}]' }),
    );
    expect(result.output).toBe('x');
  });
});

const SELECTOR_TPL = '{{selector:.title}}';

describe('render — deferred variables', () => {
  test('marks selector variables as deferred when no resolver', async () => {
    const result = await render(SELECTOR_TPL, makeCtx());
    expect(result.hasDeferredVariables).toBe(true);
    expect(result.output).toBe(SELECTOR_TPL);
  });

  test('marks selectorHtml variables as deferred when no resolver', async () => {
    const result = await render('{{selectorHtml:#main}}', makeCtx());
    expect(result.hasDeferredVariables).toBe(true);
    expect(result.output).toBe('{{selectorHtml:#main}}');
  });

  test('uses asyncResolver when provided', async () => {
    const ctx = makeCtx(
      {},
      {
        asyncResolver: async (name) => `resolved:${name}`,
      },
    );
    const result = await render(SELECTOR_TPL, ctx);
    expect(result.output).toBe('resolved:selector:.title');
  });
});
