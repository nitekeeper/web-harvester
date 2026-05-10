// tests/unit/presentation/background/bridges.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { CoreHookSystem } from '@core/hooks';
import { buildClipHooksPort, compileTemplateForService } from '@presentation/background/bridges';

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

describe('buildClipHooksPort', () => {
  it('forwards selectedTemplateId from app-layer ClipContent to the domain hook', async () => {
    let capturedId: string | undefined;
    const mockHooks = {
      beforeClip: {
        tapAsync: vi.fn(),
        tap: vi.fn(),
        call: vi.fn(async (v: { selectedTemplateId?: string; body?: string }) => {
          capturedId = v.selectedTemplateId;
          return { ...v, body: 'transformed' };
        }),
      },
      afterClip: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
      beforeSave: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn(async (v: unknown) => v) },
      afterSave: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
      onClip: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
      onHighlight: { tap: vi.fn(), tapAsync: vi.fn(), call: vi.fn() },
      onTemplateRender: {
        tap: vi.fn(),
        tapAsync: vi.fn(),
        call: vi.fn(async (v: unknown) => v as string),
      },
    } as unknown as CoreHookSystem;

    const port = buildClipHooksPort(mockHooks);
    await port.beforeClip.call({
      url: 'https://example.com',
      html: '<p>hello</p>',
      title: 'Test',
      selectedTemplateId: 'my-template-id',
    });

    expect(capturedId).toBe('my-template-id');
  });
});
