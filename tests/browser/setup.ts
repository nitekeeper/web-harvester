import { beforeAll } from 'vitest';

import { loadLocale } from '@application/i18n/localeService';

beforeAll(async () => {
  await loadLocale('en');
});
