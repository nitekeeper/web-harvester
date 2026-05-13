// tests/unit/presentation/settings/sections/destinationsSection.utils.test.ts

import { describe, expect, it } from 'vitest';

import { formatLastUsed } from '@presentation/settings/sections/destinationsSection.utils';

/**
 * Minimal formatting function that returns the pre-constructed defaultMessage
 * string directly — no i18n runtime needed in unit tests.
 */
const fmt = ({
  defaultMessage,
}: {
  id: string;
  defaultMessage: string;
  values?: Record<string, string | number>;
}): string => defaultMessage;

/** Fixed "now" timestamp used by the calendar-date branch tests: 2024-06-15 noon UTC. */
const NOW_2024_JUN_15 = new Date('2024-06-15T12:00:00.000Z').getTime();

describe('formatLastUsed', () => {
  it('returns "last used just now" when elapsed time is under 60 seconds', () => {
    const now = 1_000_000_000_000;
    const lastUsed = now - 30_000; // 30 seconds ago
    expect(formatLastUsed(lastUsed, now, fmt)).toBe('last used just now');
  });

  it('returns "last used N min ago" when elapsed time is under 60 minutes', () => {
    const now = 1_000_000_000_000;
    const lastUsed = now - 5 * 60_000; // 5 minutes ago
    expect(formatLastUsed(lastUsed, now, fmt)).toContain('5');
    expect(formatLastUsed(lastUsed, now, fmt)).toContain('min ago');
  });

  it('returns "last used N hours ago" when elapsed time is under 24 hours', () => {
    const now = 1_000_000_000_000;
    const lastUsed = now - 3 * 60 * 60_000; // 3 hours ago
    expect(formatLastUsed(lastUsed, now, fmt)).toContain('3');
    expect(formatLastUsed(lastUsed, now, fmt)).toContain('hour');
  });

  it('returns "last used yesterday" when the date is the previous calendar day', () => {
    // now = 2024-06-15 noon UTC, lastUsed = 2024-06-14 noon UTC
    const lastUsed = new Date('2024-06-14T12:00:00.000Z').getTime();
    expect(formatLastUsed(lastUsed, NOW_2024_JUN_15, fmt)).toBe('last used yesterday');
  });

  it('returns "last used Mon DD" when the date is in the current year but not yesterday', () => {
    // lastUsed = 2024-03-10 (same year as NOW_2024_JUN_15, not yesterday)
    const lastUsed = new Date('2024-03-10T12:00:00.000Z').getTime();
    const result = formatLastUsed(lastUsed, NOW_2024_JUN_15, fmt);
    expect(result).toContain('Mar');
    expect(result).toContain('10');
    expect(result).not.toContain('2024');
  });

  it('returns "last used Mon DD, YYYY" when the date is in a prior year', () => {
    // lastUsed = 2022-11-08 (prior year relative to NOW_2024_JUN_15)
    const lastUsed = new Date('2022-11-08T12:00:00.000Z').getTime();
    const result = formatLastUsed(lastUsed, NOW_2024_JUN_15, fmt);
    expect(result).toContain('Nov');
    expect(result).toContain('8');
    expect(result).toContain('2022');
  });
});
