import { describe, it, expect } from 'vitest';

import {
  SYSTEM_TEMPLATES,
  mergeTemplates,
} from '@presentation/settings/sections/templates/systemTemplates';
import type { TemplateConfig } from '@shared/types';

describe('SYSTEM_TEMPLATES', () => {
  it('has exactly three entries', () => {
    expect(SYSTEM_TEMPLATES).toHaveLength(3);
  });

  it('all have isSystem true', () => {
    expect(SYSTEM_TEMPLATES.every((t) => t.isSystem)).toBe(true);
  });

  it('ids are stable and unique', () => {
    const ids = SYSTEM_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toContain('sys-default-article');
  });
});

describe('mergeTemplates', () => {
  const userTemplates: readonly TemplateConfig[] = [
    { id: 'u1', name: 'Zephyr', frontmatterTemplate: '', bodyTemplate: '', noteNameTemplate: '' },
    { id: 'u2', name: 'Alpha', frontmatterTemplate: '', bodyTemplate: '', noteNameTemplate: '' },
  ];

  it('places system templates before user templates', () => {
    const merged = mergeTemplates(userTemplates);
    const systemCount = SYSTEM_TEMPLATES.length;
    merged.slice(0, systemCount).forEach((t) => expect(t.isSystem).toBe(true));
    merged.slice(systemCount).forEach((t) => expect(t.isSystem).toBe(false));
  });

  it('sorts user templates alphabetically by name', () => {
    const merged = mergeTemplates(userTemplates);
    const userPart = merged.filter((t) => !t.isSystem);
    expect(userPart).toHaveLength(2);
    expect(userPart[0]?.name).toBe('Alpha');
    expect(userPart[1]?.name).toBe('Zephyr');
  });

  it('sorts system templates alphabetically within their group', () => {
    const merged = mergeTemplates([]);
    const systemPart = merged.filter((t) => t.isSystem);
    const names = systemPart.map((t) => t.name);
    expect(names).toEqual([...names].sort());
  });
});
