// Tiny wrapper around navigator.vibrate so callers don't have to feature-
// detect or guard against missing API in test envs. Patterns are short so
// they feel like native iOS Taptic Engine ticks, not a phone alert.

function buzz(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore — Safari throws if called too rapidly
  }
}

export const haptics = {
  /** Light confirmation — tap a button, send a message, mark done. */
  tick: () => buzz(8),
  /** Medium confirmation — drop on a kanban column, save edit. */
  bump: () => buzz(14),
  /** Two-pulse success — created/saved with a side effect. */
  success: () => buzz([10, 40, 10]),
  /** Three-pulse warning — destructive prompt, undo window started. */
  warn: () => buzz([20, 60, 20, 60, 20]),
};
