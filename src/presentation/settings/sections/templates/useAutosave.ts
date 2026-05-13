import { useCallback, useEffect, useRef, useState } from 'react';

/** Lifecycle state of the autosave debounce cycle. */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Return value of {@link useAutosave}. */
interface UseAutosaveResult {
  /** Current save lifecycle status. */
  readonly status: AutosaveStatus;
  /** Marks the content as dirty and schedules a save after `delayMs`. */
  readonly trigger: () => void;
  /** Cancels the pending debounce and runs `save` immediately. */
  readonly flush: () => void;
}

/** Executes the save callback and updates status accordingly. */
async function execSave(
  saveRef: React.MutableRefObject<() => Promise<void>>,
  setStatus: (s: AutosaveStatus) => void,
  savedTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
): Promise<void> {
  setStatus('saving');
  try {
    await saveRef.current();
    setStatus('saved');
    savedTimerRef.current = setTimeout(() => setStatus('idle'), 1500);
  } catch {
    setStatus('error');
  }
}

/**
 * Debounce-save hook. Calls `save` after `delayMs` ms of inactivity.
 * `flush()` runs `save` immediately (e.g. on Cmd+S).
 * Status transitions: idle → saving → saved (1.5s) → idle, or → error on reject.
 */
export function useAutosave(save: () => Promise<void>, delayMs = 800): UseAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const runSave = useCallback(
    () => execSave(saveRef, setStatus, savedTimerRef).catch(() => undefined),
    [],
  );

  const trigger = useCallback((): void => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
    timerRef.current = setTimeout(runSave, delayMs);
  }, [delayMs, runSave]);

  const flush = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    runSave();
  }, [runSave]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
    },
    [],
  );

  return { status, trigger, flush };
}
