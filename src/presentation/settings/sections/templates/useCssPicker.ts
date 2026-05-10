// src/presentation/settings/sections/templates/useCssPicker.ts
import { useCallback, useEffect, useRef, useState } from 'react';

import { createLogger } from '@shared/logger';
import { CSS_PICKER_RESULT_KEY, MSG_START_CSS_PICKER } from '@shared/messages';

const logger = createLogger('useCssPicker');

/** Returned by {@link useCssPicker}. */
export interface CssPickerState {
  /** Whether a CSS pick session is currently active. */
  readonly isPicking: boolean;
  /** Start picking for the given field. Sends START_CSS_PICKER to the background. */
  readonly handlePickElement: (field: 'frontmatter' | 'body') => void;
}

/**
 * Manages CSS picker state: sends START_CSS_PICKER message to background,
 * listens for cssPickerResult in storage, and reports back via `onResult`.
 */
export function useCssPicker(
  onResult: (field: 'frontmatter' | 'body', variable: string) => void,
): CssPickerState {
  const [isPicking, setIsPicking] = useState(false);
  const activeField = useRef<'frontmatter' | 'body' | null>(null);

  useEffect(() => {
    /* eslint-disable no-restricted-syntax */
    function onStorageChanged(
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ): void {
      if (area !== 'local') return;
      if (!Object.prototype.hasOwnProperty.call(changes, CSS_PICKER_RESULT_KEY)) return;
      // eslint-disable-next-line security/detect-object-injection
      const result = (changes[CSS_PICKER_RESULT_KEY] as chrome.storage.StorageChange).newValue as
        | { selector: string; timestamp: number }
        | undefined;
      if (!result || !activeField.current) return;
      onResult(activeField.current, `{{selector:${result.selector}}}`);
      setIsPicking(false);
      activeField.current = null;
    }
    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => {
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
    /* eslint-enable no-restricted-syntax */
  }, [onResult]);

  const handlePickElement = useCallback((field: 'frontmatter' | 'body'): void => {
    activeField.current = field;
    setIsPicking(true);
    /* eslint-disable-next-line no-restricted-syntax */
    chrome.runtime.sendMessage({ type: MSG_START_CSS_PICKER }).catch((err: unknown) => {
      logger.warn('START_CSS_PICKER send failed', err);
      setIsPicking(false);
      activeField.current = null;
    });
  }, []);

  return { isPicking, handlePickElement };
}
