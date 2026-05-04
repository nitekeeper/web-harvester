// tests/unit/presentation/mountApp.test.ts
//
// Unit tests for the shared SPA entry-point helper.

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@presentation/theme/bootstrapTheme', () => ({
  bootstrapTheme: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn().mockReturnValue({ render: vi.fn() }),
}));

import { mountApp } from '@presentation/lib/mountApp';

function StubComponent() {
  return null;
}

describe('mountApp', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('throws when the root DOM element is absent', () => {
    expect(() => mountApp(StubComponent)).toThrow('Root element not found');
  });

  it('calls bootstrapTheme and mounts when root element is present', async () => {
    const rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);

    const { bootstrapTheme } = await import('@presentation/theme/bootstrapTheme');
    const { createRoot } = await import('react-dom/client');

    mountApp(StubComponent);

    expect(bootstrapTheme).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledWith(rootEl);
    });
  });
});
