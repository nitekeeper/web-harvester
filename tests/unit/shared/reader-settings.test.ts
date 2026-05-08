import { describe, expect, it } from 'vitest';

import { defaultReaderSettings } from '@shared/reader-settings';

describe('defaultReaderSettings', () => {
  it('returns an object with all expected properties', () => {
    const settings = defaultReaderSettings();
    expect(settings).toEqual({
      fontSize: 16,
      lineHeight: 1.6,
      maxWidth: 38,
      theme: 'auto',
      fontFamily: 'default',
      showHighlights: true,
    });
  });

  it('returns distinct objects on each call', () => {
    const settings1 = defaultReaderSettings();
    const settings2 = defaultReaderSettings();
    expect(settings1).toEqual(settings2);
    expect(settings1).not.toBe(settings2);
  });

  it('returns a valid ReaderSettings object', () => {
    const settings = defaultReaderSettings();
    expect(typeof settings.fontSize).toBe('number');
    expect(typeof settings.lineHeight).toBe('number');
    expect(typeof settings.maxWidth).toBe('number');
    expect(typeof settings.theme).toBe('string');
    expect(typeof settings.fontFamily).toBe('string');
    expect(typeof settings.showHighlights).toBe('boolean');
  });
});
