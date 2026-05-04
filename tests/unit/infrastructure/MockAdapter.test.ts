// tests/unit/infrastructure/MockAdapter.test.ts

import { describe, it, expect, vi } from 'vitest';

import { MockAdapter } from '../../helpers/MockAdapter.js';

describe('MockAdapter — tabs', () => {
  it('getActiveTab returns a mock tab', async () => {
    const adapter = new MockAdapter();
    const tab = await adapter.getActiveTab();
    expect(tab.id).toBeTypeOf('number');
    expect(tab.url).toBeTypeOf('string');
    expect(tab.title).toBeTypeOf('string');
  });
});

describe('MockAdapter — storage', () => {
  it('getLocal returns undefined by default', async () => {
    const adapter = new MockAdapter();
    const result = await adapter.getLocal('any-key');
    expect(result).toBeUndefined();
  });

  it('setLocal and getLocal round-trip', async () => {
    const adapter = new MockAdapter();
    await adapter.setLocal('key', { value: 42 });
    const result = await adapter.getLocal('key');
    expect(result).toEqual({ value: 42 });
  });

  it('onChanged fires when setLocal is called', async () => {
    const adapter = new MockAdapter();
    const handler = vi.fn();
    adapter.onChanged(handler);
    await adapter.setLocal('x', 'y');
    expect(handler).toHaveBeenCalledWith({ x: { newValue: 'y' } });
  });

  it('getSync returns undefined by default', async () => {
    const adapter = new MockAdapter();
    const result = await adapter.getSync('missing');
    expect(result).toBeUndefined();
  });

  it('setSync and getSync round-trip', async () => {
    const adapter = new MockAdapter();
    await adapter.setSync('setting', true);
    expect(await adapter.getSync('setting')).toBe(true);
  });

  it('removeLocal deletes stored value', async () => {
    const adapter = new MockAdapter();
    await adapter.setLocal('k', 1);
    await adapter.removeLocal('k');
    expect(await adapter.getLocal('k')).toBeUndefined();
  });
});

describe('MockAdapter — clipboard & runtime', () => {
  it('writeText and readText round-trip', async () => {
    const adapter = new MockAdapter();
    await adapter.writeText('hello');
    expect(await adapter.readText()).toBe('hello');
  });

  it('getURL returns mock extension URL', () => {
    const adapter = new MockAdapter();
    const url = adapter.getURL('icons/icon-48.png');
    expect(url).toContain('icons/icon-48.png');
  });
});

describe('MockAdapter — vi.fn() stubs', () => {
  it('vi.fn() stubs are callable without throwing', () => {
    const adapter = new MockAdapter();
    expect(() => adapter.showNotification('id', 'msg')).not.toThrow();
    expect(() => adapter.clearNotification('id')).not.toThrow();
    expect(() => adapter.setBadgeText('!', 1)).not.toThrow();
    expect(() => adapter.setBadgeColor('#ff0000')).not.toThrow();
    expect(() => adapter.setIcon('path/to/icon.png')).not.toThrow();
    expect(() => adapter.openPopup()).not.toThrow();
    expect(() => adapter.onCommand(() => {})).not.toThrow();
    expect(() => adapter.onTabActivated(() => {})).not.toThrow();
    expect(() => adapter.onTabUpdated(() => {})).not.toThrow();
    expect(() =>
      adapter.createContextMenu({
        id: 'x',
        title: 'X',
        contexts: ['page'],
      }),
    ).not.toThrow();
  });
});
