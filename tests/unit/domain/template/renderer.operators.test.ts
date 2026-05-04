// tests/unit/domain/template/renderer.operators.test.ts
//
// Coverage tests for binary/unary operators, isTruthy, and the `contains`
// operator paths in the expression evaluator.
import { describe, test, expect } from 'vitest';

import { render } from '@domain/template/renderer';

import { makeCtx } from './_renderer-helpers';

describe('render — equality and ordering operators', () => {
  test('equality and inequality operators', async () => {
    const eq = await render('{% if x == 1 %}eq{% endif %}', makeCtx({ x: 1 }));
    expect(eq.output).toContain('eq');
    const neq = await render('{% if x != 1 %}neq{% endif %}', makeCtx({ x: 2 }));
    expect(neq.output).toContain('neq');
  });

  test('numeric ordering operators', async () => {
    const gt = await render('{% if x > 1 %}gt{% endif %}', makeCtx({ x: 5 }));
    const lt = await render('{% if x < 10 %}lt{% endif %}', makeCtx({ x: 5 }));
    const gte = await render('{% if x >= 5 %}gte{% endif %}', makeCtx({ x: 5 }));
    const lte = await render('{% if x <= 5 %}lte{% endif %}', makeCtx({ x: 5 }));
    expect(gt.output).toContain('gt');
    expect(lt.output).toContain('lt');
    expect(gte.output).toContain('gte');
    expect(lte.output).toContain('lte');
  });
});

describe('render — logical operators', () => {
  test('logical and / or operators', async () => {
    const a = await render('{% if a and b %}both{% endif %}', makeCtx({ a: 1, b: 1 }));
    const o = await render('{% if a or b %}any{% endif %}', makeCtx({ a: 0, b: 1 }));
    expect(a.output).toContain('both');
    expect(o.output).toContain('any');
  });

  test('not unary operator', async () => {
    const result = await render('{% if not flag %}neg{% endif %}', makeCtx({ flag: false }));
    expect(result.output).toContain('neg');
  });

  test('grouped expression preserves precedence', async () => {
    const result = await render(
      '{% if (a or b) and c %}ok{% endif %}',
      makeCtx({ a: 0, b: 1, c: 1 }),
    );
    expect(result.output).toContain('ok');
  });
});

const Y_OR_N = '{% if expr %}y{% else %}n{% endif %}';
function templateForContains(left: string, right: string): string {
  return Y_OR_N.replace('expr', `${left} contains ${right}`);
}

describe('render — contains operator: happy paths', () => {
  test('contains operator on strings (case-insensitive)', async () => {
    const result = await render(
      '{% if title contains "world" %}match{% endif %}',
      makeCtx({ title: 'Hello World' }),
    );
    expect(result.output).toContain('match');
  });

  test('contains operator on arrays', async () => {
    const result = await render(
      templateForContains('tags', '"TS"'),
      makeCtx({ tags: ['ts', 'js'] }),
    );
    expect(result.output).toBe('y');
  });

  test('contains over array with non-string members compares loosely', async () => {
    const result = await render(templateForContains('nums', '2'), makeCtx({ nums: [1, 2, 3] }));
    expect(result.output).toBe('y');
  });

  test('contains over string with non-string right coerces right to string', async () => {
    const result = await render(templateForContains('s', '2'), makeCtx({ s: 'page-2-of-5' }));
    expect(result.output).toBe('y');
  });
});

describe('render — contains operator: falsy paths', () => {
  test('contains operator returns false when left side is undefined', async () => {
    const result = await render(templateForContains('missing', '"x"'), makeCtx());
    expect(result.output).toBe('n');
  });

  test('contains operator returns false when right side is undefined', async () => {
    const result = await render(templateForContains('x', 'nothing'), makeCtx({ x: 'foo' }));
    expect(result.output).toBe('n');
  });

  test('contains where left is neither array nor string returns false', async () => {
    const result = await render(templateForContains('x', '"a"'), makeCtx({ x: 5 }));
    expect(result.output).toBe('n');
  });
});

describe('render — isTruthy edge cases', () => {
  const TRUTHY_TPL = '{% if v %}y{% else %}n{% endif %}';

  test('treats empty array as falsy', async () => {
    const result = await render(TRUTHY_TPL, makeCtx({ v: [] }));
    expect(result.output).toBe('n');
  });

  test('treats zero as falsy', async () => {
    const result = await render(TRUTHY_TPL, makeCtx({ v: 0 }));
    expect(result.output).toBe('n');
  });

  test('treats empty string as falsy', async () => {
    const result = await render(TRUTHY_TPL, makeCtx({ v: '' }));
    expect(result.output).toBe('n');
  });

  test('treats non-empty array as truthy', async () => {
    const result = await render(TRUTHY_TPL, makeCtx({ v: [1] }));
    expect(result.output).toBe('y');
  });
});

describe('render — valueToString edge cases', () => {
  test('renders single-element primitive array as the element', async () => {
    const result = await render('{{tags}}', makeCtx({ tags: ['single'] }));
    expect(result.output).toBe('single');
  });

  test('renders multi-element array as JSON', async () => {
    const result = await render('{{tags}}', makeCtx({ tags: ['a', 'b'] }));
    expect(result.output).toBe('["a","b"]');
  });

  test('renders object as JSON', async () => {
    const result = await render('{{obj}}', makeCtx({ obj: { a: 1 } }));
    expect(result.output).toBe('{"a":1}');
  });

  test('renders null as empty string', async () => {
    const result = await render('{{x}}', makeCtx({ x: null }));
    expect(result.output).toBe('');
  });
});
