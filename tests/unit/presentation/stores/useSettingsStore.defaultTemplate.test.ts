import { describe, expect, it } from 'vitest';

import { useSettingsStore } from '@presentation/stores/useSettingsStore';
import { DEFAULT_TEMPLATE } from '@shared/defaultTemplate';

describe('useSettingsStore default templates', () => {
  it('initializes templates with DEFAULT_TEMPLATE when no data is stored', () => {
    const { templates } = useSettingsStore.getState();
    expect(templates).toHaveLength(1);
    expect(templates[0]).toEqual(DEFAULT_TEMPLATE);
  });
});
