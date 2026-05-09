import { describe, it, expect } from 'vitest';

import {
  resolveNoteNamePattern,
  hasIllegalFilenameChars,
  FIXTURE_PAGE,
} from '@presentation/settings/sections/templates/noteNamePreview';

describe('resolveNoteNamePattern', () => {
  it('replaces {{date}} with the fixture date', () => {
    const result = resolveNoteNamePattern('{{date}}-notes', FIXTURE_PAGE);
    expect(result).toBe('2026-05-09-notes');
  });

  it('replaces {{title|safe_name}} with a safe version of the title', () => {
    const result = resolveNoteNamePattern('{{title|safe_name}}', FIXTURE_PAGE);
    // safe_name: lowercase, spaces to hyphens, no special chars
    expect(result).toBe('how-attention-became-the-new-currency');
  });

  it('replaces {{title}} with the raw title', () => {
    const result = resolveNoteNamePattern('{{title}}', FIXTURE_PAGE);
    expect(result).toBe(FIXTURE_PAGE.title);
  });

  it('handles a combined pattern', () => {
    const result = resolveNoteNamePattern('{{date}}-{{title|safe_name}}', FIXTURE_PAGE);
    expect(result).toBe('2026-05-09-how-attention-became-the-new-currency');
  });

  it('leaves unrecognised tokens in place', () => {
    const result = resolveNoteNamePattern('prefix-{{unknown}}', FIXTURE_PAGE);
    expect(result).toBe('prefix-{{unknown}}');
  });
});

describe('hasIllegalFilenameChars', () => {
  it('returns false for a valid filename', () => {
    expect(hasIllegalFilenameChars('2026-05-09-notes.md')).toBe(false);
  });

  it('returns true for a colon', () => {
    expect(hasIllegalFilenameChars('notes: updated.md')).toBe(true);
  });

  it('returns true for a question mark', () => {
    expect(hasIllegalFilenameChars('what?.md')).toBe(true);
  });

  it('returns true for a forward slash', () => {
    expect(hasIllegalFilenameChars('path/file.md')).toBe(true);
  });
});
