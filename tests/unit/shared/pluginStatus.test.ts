import { describe, expect, it } from 'vitest';

import { isPluginStatusPayload, PLUGIN_STATUS_STORAGE_KEY } from '@shared/pluginStatus';

describe('isPluginStatusPayload', () => {
  it('returns false for null', () => {
    expect(isPluginStatusPayload(null)).toBe(false);
  });

  it('returns false for a plain string', () => {
    expect(isPluginStatusPayload('hello')).toBe(false);
  });

  it('returns false when plugins is not an array', () => {
    expect(isPluginStatusPayload({ plugins: 'bad' })).toBe(false);
  });

  it('returns false when a plugin row is missing state', () => {
    expect(isPluginStatusPayload({ plugins: [{ id: 'x', name: 'X' }] })).toBe(false);
  });

  it('returns false when a plugin row has an unknown state', () => {
    expect(isPluginStatusPayload({ plugins: [{ id: 'x', name: 'X', state: 'loading' }] })).toBe(
      false,
    );
  });

  it('returns true for a valid active row', () => {
    expect(isPluginStatusPayload({ plugins: [{ id: 'x', name: 'X', state: 'active' }] })).toBe(
      true,
    );
  });

  it('returns true for a valid failed row with error', () => {
    expect(
      isPluginStatusPayload({
        plugins: [{ id: 'x', name: 'X', state: 'failed', error: 'boom' }],
      }),
    ).toBe(true);
  });

  it('returns true for an empty plugins array', () => {
    expect(isPluginStatusPayload({ plugins: [] })).toBe(true);
  });
});

describe('PLUGIN_STATUS_STORAGE_KEY', () => {
  it('equals the exact storage key string', () => {
    expect(PLUGIN_STATUS_STORAGE_KEY).toBe('wh_plugin_status');
  });
});
