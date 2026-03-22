// useDebounce hook - delays updating a value until after a pause in changes
// Usage: const debouncedSearch = useDebounce(searchTerm, 300);

import { useState, useEffect } from "react";

/**
 * Debounces a value by the given delay in milliseconds.
 * The returned value only updates after the caller stops changing
 * the input value for at least `delay` ms.
 *
 * @param value - The value to debounce (generic)
 * @param delay - Debounce window in milliseconds (default 300)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timeout on value/delay change and on unmount
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
