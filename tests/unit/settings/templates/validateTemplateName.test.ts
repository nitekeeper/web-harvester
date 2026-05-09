import { describe, it, expect } from 'vitest';

import { validateTemplateName } from '@presentation/settings/sections/templates/validateTemplateName';

const MY_TEMPLATE = 'My Template';

describe('validateTemplateName', () => {
  it('returns valid for a non-empty unique name', () => {
    const result = validateTemplateName(MY_TEMPLATE, ['Existing']);
    expect(result).toEqual({ valid: true });
  });

  it('returns empty error for a blank name', () => {
    expect(validateTemplateName('', [])).toEqual({ valid: false, reason: 'empty' });
  });

  it('returns empty error for a whitespace-only name', () => {
    expect(validateTemplateName('   ', [])).toEqual({ valid: false, reason: 'empty' });
  });

  it('returns duplicate error when name matches an existing template (case-insensitive)', () => {
    const result = validateTemplateName('my template', [MY_TEMPLATE, 'Other']);
    expect(result).toEqual({ valid: false, reason: 'duplicate' });
  });

  it('allows keeping current name when caller pre-filters existingNames (editing own name)', () => {
    // Callers must exclude the template being renamed from existingNames.
    // An empty list simulates the renamed template being excluded.
    const result = validateTemplateName(MY_TEMPLATE, []);
    expect(result).toEqual({ valid: true });
  });
});
