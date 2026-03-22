// useDebouncedCallback - debounces a callback function
// Usage: const debouncedSearch = useDebouncedCallback((query) => fetchResults(query), 300);

import { useCallback, useEffect, useRef } from "react";

type AnyFunction = (...args: any[]) => any;

interface DebouncedFunction<T extends AnyFunction> {
  (...args: Parameters<T>): void;
  /** Cancel any pending invocation */
  cancel: () => void;
}

/**
 * Returns a debounced version of the provided callback.
 * The callback will only be invoked after `delay` ms have elapsed
 * since the last call. Includes a `.cancel()` method to abort
 * any pending invocation.
 *
 * The returned function reference is stable across re-renders
 * (via useRef), so it is safe to use in dependency arrays.
 *
 * @param callback - The function to debounce
 * @param delay - Debounce window in milliseconds (default 300)
 * @returns A debounced version of the callback with a .cancel() method
 */
export function useDebouncedCallback<T extends AnyFunction>(
  callback: T,
  delay = 300,
): DebouncedFunction<T> {
  const callbackRef = useRef<T>(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the callback ref up to date without causing re-renders
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      cancel();
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timerRef.current = null;
      }, delay);
    },
    [delay, cancel],
  ) as DebouncedFunction<T>;

  // Attach cancel to the debounced function
  debouncedFn.cancel = cancel;

  return debouncedFn;
}
