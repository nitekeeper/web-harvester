// tests/unit/application/i18n/localeService.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@domain/i18n/i18n', () => ({
  loadLocale: vi.fn(),
  formatMessage: vi.fn(),
  getCurrentLocale: vi.fn(),
  isRTL: vi.fn(),
}));

import {
  formatMessage,
  getCurrentLocale,
  isRTL,
  loadLocale,
} from '@application/i18n/localeService';
import {
  formatMessage as domainFormatMessage,
  getCurrentLocale as domainGetCurrentLocale,
  isRTL as domainIsRTL,
  loadLocale as domainLoadLocale,
} from '@domain/i18n/i18n';

describe('localeService', () => {
  it('re-exports loadLocale from the domain', () => {
    expect(loadLocale).toBe(domainLoadLocale);
  });

  it('re-exports formatMessage from the domain', () => {
    expect(formatMessage).toBe(domainFormatMessage);
  });

  it('re-exports getCurrentLocale from the domain', () => {
    expect(getCurrentLocale).toBe(domainGetCurrentLocale);
  });

  it('re-exports isRTL from the domain', () => {
    expect(isRTL).toBe(domainIsRTL);
  });
});
