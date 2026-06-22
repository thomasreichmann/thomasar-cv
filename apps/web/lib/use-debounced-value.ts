import { useEffect, useState } from "react";

/**
 * The value, but updates settle only after it has stopped changing for `delayMs`.
 * The current value is returned immediately on first render, so a consumer (the
 * live preview, #39) renders once up front and only debounces subsequent edits
 * rather than waiting out the delay before showing anything.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
