// tests/unit/domain/template/renderer.test.ts
import { describe, test, expect } from 'vitest';

import { createPopulatedFilterRegistry } from '@domain/filters/index';
import { render, renderAST, type RenderContext } from '@domain/template/renderer';

function makeCtx(vars: Record<string, unknown> = {}): RenderContext {
  return {
    variables: vars,
    currentUrl: 'https://example.com',
    filterRegistry: createPopulatedFilterRegistry(),
  };
}

describe('render — plain text', () => {
  test('renders plain text unchanged', async () => {
    const result = await render('Hello, world!', makeCtx());
    expect(result.errors).toHaveLength(0);
    expect(result.output).toBe('Hello, world!');
  });

  test('renders empty string', async () => {
    const result = await render('', makeCtx());
    expect(result.output).toBe('');
  });
});

describe('render — variable interpolation: basics', () => {
  test('renders a simple variable', async () => {
    const result = await render('{{title}}', makeCtx({ title: 'My Page' }));
    expect(result.errors).toHaveLength(0);
    expect(result.output).toBe('My Page');
  });

  test('renders undefined variable as empty string', async () => {
    const result = await render('{{missing}}', makeCtx());
    expect(result.output).toBe('');
  });

  test('renders nullish coalescing', async () => {
    const withValue = await render('{{author ?? "Unknown"}}', makeCtx({ author: 'Alice' }));
    expect(withValue.output).toBe('Alice');

    const withFallback = await render('{{author ?? "Unknown"}}', makeCtx());
    expect(withFallback.output).toBe('Unknown');
  });

  test('renders string literal directly', async () => {
    const result = await render('{{"static"}}', makeCtx());
    expect(result.output).toBe('static');
  });

  test('renders number literal', async () => {
    const result = await render('{{42}}', makeCtx());
    expect(result.output).toBe('42');
  });
});

describe('render — variable interpolation: filters', () => {
  test('renders variable with lower filter', async () => {
    const result = await render('{{title|lower}}', makeCtx({ title: 'HELLO' }));
    expect(result.output).toBe('hello');
  });

  test('renders variable with upper filter', async () => {
    const result = await render('{{title|upper}}', makeCtx({ title: 'hello' }));
    expect(result.output).toBe('HELLO');
  });

  test('renders variable with trim filter', async () => {
    const result = await render('{{title|trim}}', makeCtx({ title: '  hello  ' }));
    expect(result.output).toBe('hello');
  });

  test('renders chained filters', async () => {
    const result = await render('{{title|lower|trim}}', makeCtx({ title: '  HELLO  ' }));
    expect(result.output).toBe('hello');
  });
});

describe('render — conditional rendering', () => {
  test('renders if branch when condition is truthy', async () => {
    const result = await render('{% if show %}yes{% endif %}', makeCtx({ show: true }));
    expect(result.output).toContain('yes');
  });

  test('skips if branch when condition is falsy', async () => {
    const result = await render('{% if show %}yes{% endif %}', makeCtx({ show: false }));
    expect(result.output).not.toContain('yes');
  });

  test('renders else branch when condition is false', async () => {
    const result = await render(
      '{% if show %}yes{% else %}no{% endif %}',
      makeCtx({ show: false }),
    );
    expect(result.output).toContain('no');
  });

  test('renders correct elseif branch', async () => {
    const template = '{% if x == 1 %}one{% elseif x == 2 %}two{% else %}other{% endif %}';
    const one = await render(template, makeCtx({ x: 1 }));
    const two = await render(template, makeCtx({ x: 2 }));
    const other = await render(template, makeCtx({ x: 3 }));
    expect(one.output).toContain('one');
    expect(two.output).toContain('two');
    expect(other.output).toContain('other');
  });
});

describe('render — for loops', () => {
  test('renders each item in a loop', async () => {
    const result = await render(
      '{% for tag in tags %}{{tag}} {% endfor %}',
      makeCtx({ tags: ['a', 'b', 'c'] }),
    );
    expect(result.output.trim()).toBe('a\nb\nc');
  });

  test('renders nothing for empty array', async () => {
    const result = await render(
      '{% for item in items %}{{item}}{% endfor %}',
      makeCtx({ items: [] }),
    );
    expect(result.output).toBe('');
  });

  test('renders nothing for undefined iterable', async () => {
    const result = await render('{% for item in items %}{{item}}{% endfor %}', makeCtx());
    expect(result.output).toBe('');
  });

  test('exposes loop.index inside for body', async () => {
    const result = await render(
      '{% for item in items %}{{loop.index}}{% endfor %}',
      makeCtx({ items: ['a', 'b'] }),
    );
    expect(result.output).toContain('1');
    expect(result.output).toContain('2');
  });
});

describe('render — set statements', () => {
  test('sets a variable usable later in template', async () => {
    const result = await render('{% set greeting = "hello" %}{{greeting}}', makeCtx());
    expect(result.output).toBe('hello');
  });
});

describe('render — error handling', () => {
  test('returns error for parse failure', async () => {
    const result = await render('{{unclosed', makeCtx());
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('render — trimOutput option', () => {
  test('trims whitespace from output when requested', async () => {
    const result = await render('  hello  ', makeCtx(), { trimOutput: true });
    expect(result.output).toBe('hello');
  });
});

describe('renderAST', () => {
  test('is exported and renders an empty AST', async () => {
    const result = await renderAST([], makeCtx());
    expect(result.output).toBe('');
    expect(result.errors).toHaveLength(0);
  });
});
