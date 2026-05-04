// tests/unit/domain/template/renderer.flow.test.ts
//
// Coverage tests for control-flow constructs (for loops with edge cases),
// error reporting, filter argument coercion, the renderAST entry point,
// the createFilterRegistry stub, and whitespace-control branches.
import { describe, test, expect } from 'vitest';

import { createFilterRegistry, type IFilterRegistry } from '@domain/filters/index';
import { render, renderAST } from '@domain/template/renderer';

import { makeCtx } from './_renderer-helpers';

const FOR_BODY = '{% for x in items %}{{x}}{% endfor %}';

describe('render — for loop iteration', () => {
  test('parses JSON-string iterables', async () => {
    const result = await render(
      '{% for x in items %}{{x}} {% endfor %}',
      makeCtx({ items: '["a","b"]' }),
    );
    expect(result.output.trim()).toBe('a\nb');
  });

  test('exposes loop.first / loop.last / loop.length', async () => {
    const result = await render(
      '{% for x in items %}[{{loop.first}}-{{loop.last}}-{{loop.length}}]{% endfor %}',
      makeCtx({ items: ['a', 'b'] }),
    );
    expect(result.output).toContain('[true-false-2]');
    expect(result.output).toContain('[false-true-2]');
  });

  test('iterator_index is exposed for backwards compatibility', async () => {
    const result = await render(
      '{% for x in items %}{{x_index}} {% endfor %}',
      makeCtx({ items: ['a', 'b'] }),
    );
    expect(result.output.trim()).toBe('0\n1');
  });
});

describe('render — for loop iterable validation', () => {
  test('reports error for non-array iterable', async () => {
    const result = await render(FOR_BODY, makeCtx({ items: 42 }));
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('not an array');
  });

  test('renders nothing for null iterable', async () => {
    const result = await render(FOR_BODY, makeCtx({ items: null }));
    expect(result.output).toBe('');
    expect(result.errors).toHaveLength(0);
  });

  test('reports error for non-JSON string iterable', async () => {
    const result = await render(FOR_BODY, makeCtx({ items: 'not-json' }));
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports error for JSON-string non-array iterable', async () => {
    const result = await render(FOR_BODY, makeCtx({ items: '{"a":1}' }));
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('render — error reporting from filter throws', () => {
  function makeThrowing(message: string): IFilterRegistry {
    return {
      register: () => undefined,
      get: () => undefined,
      apply: () => {
        throw new Error(message);
      },
    };
  }

  test('reports errors thrown inside variable evaluation', async () => {
    const result = await render(
      '{{x|lower}}',
      makeCtx({ x: 'a' }, { filterRegistry: makeThrowing('boom') }),
    );
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('boom');
  });

  test('reports errors thrown inside if condition evaluation', async () => {
    const result = await render(
      '{% if x|lower %}y{% endif %}',
      makeCtx({ x: 'a' }, { filterRegistry: makeThrowing('cond-boom') }),
    );
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports errors thrown inside for iterable evaluation', async () => {
    const result = await render(
      '{% for x in items|lower %}{{x}}{% endfor %}',
      makeCtx({ items: 'a' }, { filterRegistry: makeThrowing('for-boom') }),
    );
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports errors thrown inside set value evaluation', async () => {
    const result = await render(
      '{% set y = x|lower %}{{y}}',
      makeCtx({ x: 'a' }, { filterRegistry: makeThrowing('set-boom') }),
    );
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('render — filter argument fallbacks and coercion', () => {
  function makeCapturing(): { reg: IFilterRegistry; captured: () => string[] | null } {
    let captured: string[] | null = null;
    return {
      reg: {
        register: () => undefined,
        get: () => undefined,
        apply: (_name, value, args) => {
          captured = args;
          return value;
        },
      },
      captured: () => captured,
    };
  }

  test('passes identifier-as-string when filter arg is undefined identifier', async () => {
    const { reg, captured } = makeCapturing();
    await render('{{x|date:YYYY}}', makeCtx({ x: 'a' }, { filterRegistry: reg }));
    expect(captured()).toEqual(['YYYY']);
  });

  test('passes literal arg through to the filter', async () => {
    const { reg, captured } = makeCapturing();
    await render('{{x|date:"YYYY"}}', makeCtx({ x: 'a' }, { filterRegistry: reg }));
    expect(captured()).toEqual(['YYYY']);
  });

  test('coerces numeric filter arg to string before passing to registry', async () => {
    const { reg, captured } = makeCapturing();
    await render('{{x|slice:3}}', makeCtx({ x: 'hello' }, { filterRegistry: reg }));
    expect(captured()).toEqual(['3']);
  });
});

describe('renderAST — direct usage', () => {
  test('renders pre-parsed AST', async () => {
    const ast = [{ type: 'text', value: 'hi', line: 1, column: 1 }] as const;
    const result = await renderAST(ast as never, makeCtx());
    expect(result.output).toBe('hi');
  });
});

describe('createFilterRegistry — unknown filter passthrough', () => {
  test('returns value unchanged for unknown filter name', () => {
    const reg = createFilterRegistry();
    expect(reg.apply('not-a-real-filter', 'value', ['arg'])).toBe('value');
  });
});

describe('render — trimLeadingWhitespace branches', () => {
  // appendNodeOutput consumes pendingTrimRight against the rendered output
  // of the node that set it. Crafting body content that starts with
  // whitespace exercises the inner branches of trimLeadingWhitespace.
  const TPL_PREFIX = '{% if x %}';
  const TPL_SUFFIX = '{% endif %}';
  const ctxTrue = () => makeCtx({ x: true });

  test('strips leading spaces from a tag body', async () => {
    const result = await render(`${TPL_PREFIX}   value${TPL_SUFFIX}`, ctxTrue());
    expect(result.output).toBe('value');
  });

  test('strips leading tabs from a tag body', async () => {
    const result = await render(`${TPL_PREFIX}\t\tvalue${TPL_SUFFIX}`, ctxTrue());
    expect(result.output).toBe('value');
  });

  test('strips a leading CRLF from a tag body', async () => {
    const result = await render(`${TPL_PREFIX}\r\nvalue${TPL_SUFFIX}`, ctxTrue());
    expect(result.output).toBe('value');
  });
});

describe('render — whitespace control around tag statements', () => {
  // The tokenizer always emits trimRight=true on `%}` tag-end tokens, so
  // every tag-based statement triggers the trimRight branch in the renderer.
  test('if statement renders body and emits following text', async () => {
    const result = await render('{% if x %}A{% endif %}\n   trailing', makeCtx({ x: true }));
    // The current renderer (matching the upstream behaviour) consumes
    // pendingTrimRight against the tag's own rendered body, so the
    // following text is left untouched.
    expect(result.output).toBe('A\n   trailing');
  });

  test('if statement with falsy condition still emits following text', async () => {
    const result = await render('{% if x %}A{% endif %}\n   end', makeCtx({ x: false }));
    expect(result.output.trim()).toBe('end');
  });

  test('for loop with null iterable still emits following text', async () => {
    const result = await render(
      '{% for x in items %}{{x}}{% endfor %}\n   end',
      makeCtx({ items: null }),
    );
    expect(result.output.trim()).toBe('end');
  });

  test('for loop with non-array iterable still emits following text', async () => {
    const result = await render(
      '{% for x in items %}{{x}}{% endfor %}\n   end',
      makeCtx({ items: 42 }),
    );
    expect(result.output.trim()).toBe('end');
  });

  test('set statement strips following whitespace', async () => {
    const result = await render('{% set y = "A" %}\n   value:{{y}}', makeCtx());
    expect(result.output).toContain('value:A');
  });
});
