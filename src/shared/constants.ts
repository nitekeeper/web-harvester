export const EXTENSION_NAME = 'Web Harvester';
export const EXTENSION_VERSION = '1.0.0';
export const MAX_FILE_NAME_LENGTH = 200;
export const STORAGE_KEY_PREFIX = 'web-harvester:';

export const SUPPORTED_LOCALES = [
  'ar',
  'bn',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'fa',
  'fi',
  'fr',
  'he',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'km',
  'ko',
  'nl',
  'no',
  'pl',
  'pt',
  'pt_BR',
  'ro',
  'ru',
  'sk',
  'sv',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh_CN',
  'zh_TW',
] as const;

/** A locale code supported by the extension. */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const RTL_LOCALES: SupportedLocale[] = ['ar', 'fa', 'he'];
