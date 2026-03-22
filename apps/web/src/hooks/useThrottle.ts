// useThrottle hook - limits how often a value updates
// Usage: const throttledScroll = useThrottle(scrollPosition, 100);

import { useState, useEffect, useRef } from "react";

/**
 * Throttles a value so it updates at most once every `interval` ms.
 * The first change is applied immediately; subsequent changes within
 * the interval window are deferred until the interval elapses.
 *
 * @param value - The value to throttle (generic)
 * @param interval - Minimum interval between updates in milliseconds (default 300)
 * @returns The throttled value
 */
export function useThrottle<T>(value: T, interval = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastUpdated.current;

    if (elapsed >= interval) {
      // Enough time has passed — update immediately
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      // Schedule an update for the remaining time in the interval
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
        timeoutRef.current = null;
      }, interval - elapsed);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, interval]);

  return throttledValue;
}
