/**
 * Reader display settings controlling typography, layout, and theme.
 */
export interface ReaderSettings {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly maxWidth: number;
  readonly theme: 'auto' | 'light' | 'dark' | 'sepia';
  readonly fontFamily: string;
  readonly showHighlights: boolean;
}

/**
 * Returns the default reader settings.
 */
export function defaultReaderSettings(): ReaderSettings {
  return {
    fontSize: 16,
    lineHeight: 1.6,
    maxWidth: 38,
    theme: 'auto',
    fontFamily: 'default',
    showHighlights: true,
  };
}
