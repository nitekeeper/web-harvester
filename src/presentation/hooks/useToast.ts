// src/presentation/hooks/useToast.ts

import { useCallback, useRef, useState } from 'react';

/** Options for a toast notification. */
export interface ToastOptions {
  readonly message: string;
  readonly undoLabel?: string;
  readonly onUndo?: () => void;
  readonly durationMs?: number;
}

/** Shape returned by {@link useToast}. */
interface UseToastResult {
  readonly toast: ToastOptions | null;
  readonly show: (opts: ToastOptions) => void;
  readonly dismiss: () => void;
}

/**
 * Manages a single bottom-center toast. Calling `show()` replaces any
 * existing toast immediately. The toast auto-dismisses after `durationMs`
 * (default 5000ms).
 */
export function useToast(): UseToastResult {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback((): void => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (opts: ToastOptions): void => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      setToast(opts);
      timerRef.current = setTimeout(dismiss, opts.durationMs ?? 5000);
    },
    [dismiss],
  );

  return { toast, show, dismiss };
}
