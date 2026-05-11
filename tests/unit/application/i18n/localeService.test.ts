// tests/unit/application/i18n/localeService.test.ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@domain/i18n/i18n', () => ({
  loadLocale: vi.fn(),
  formatMessage: vi.fn(),
}));

import { formatMessage, loadLocale } from '@application/i18n/localeService';
import {
  formatMessage as domainFormatMessage,
  loadLocale as domainLoadLocale,
} from '@domain/i18n/i18n';

describe('localeService', () => {
  it('re-exports loadLocale from the domain', () => {
    expect(loadLocale).toBe(domainLoadLocale);
  });

  it('re-exports formatMessage from the domain', () => {
    expect(formatMessage).toBe(domainFormatMessage);
  });
});
