"use client";

import toast from "react-hot-toast";

/**
 * optimisticAction — applies a UI mutation immediately, runs the real
 * mutation in the background, and rolls back with a toast on failure.
 *
 * The pattern every list view should use so a row update never shows a
 * spinner. Local store updates are synchronous; the toast surfaces
 * failures (network, validation) without blocking interaction.
 *
 *   await optimisticAction({
 *     apply:    () => store.update(id, patch),       // sync, never throws
 *     commit:   () => api.deals.update(id, patch),    // async, may throw
 *     rollback: () => store.update(id, original),    // sync, never throws
 *     successMessage: "Deal updated",
 *     errorMessage:   "Couldn't save — reverted.",
 *   });
 *
 * If `commit` is omitted the action stays purely local — useful when the
 * Zustand store is the source of truth and there is no remote API yet.
 */
export interface OptimisticActionOptions<T> {
  /** Synchronous UI mutation. Apply your change to the store here. */
  apply: () => void;
  /** Background mutation. Throw to trigger rollback. Optional. */
  commit?: () => Promise<T>;
  /** Synchronous reversal called when commit throws. */
  rollback: () => void;
  /** Toast on success. Pass null to suppress. */
  successMessage?: string | null;
  /** Toast on failure. */
  errorMessage?: string;
  /** Suppress the success toast entirely (silent inline edits). */
  silent?: boolean;
}

export async function optimisticAction<T>({
  apply,
  commit,
  rollback,
  successMessage,
  errorMessage = "Couldn't save — reverted.",
  silent = false,
}: OptimisticActionOptions<T>): Promise<T | undefined> {
  apply();

  if (!commit) {
    if (!silent && successMessage) toast.success(successMessage);
    return undefined;
  }

  try {
    const result = await commit();
    if (!silent && successMessage) toast.success(successMessage);
    return result;
  } catch (err) {
    rollback();
    toast.error(errorMessage);
    if (process.env.NODE_ENV !== "production") {
      console.error("[optimisticAction] rollback:", err);
    }
    return undefined;
  }
}

/**
 * optimisticDelete — convenience for the common "remove a row, undo on
 * failure" flow. Captures the deleted item so rollback can re-insert.
 *
 *   optimisticDelete({
 *     remove:  () => store.delete(deal.id),
 *     restore: () => store.add(deal),
 *     commit:  () => api.deals.delete(deal.id),
 *     label:   "deal",
 *   });
 */
export interface OptimisticDeleteOptions<T> {
  remove: () => void;
  restore: () => void;
  commit?: () => Promise<T>;
  /** Singular noun for messages: "deal" → "Deal deleted." */
  label: string;
  silent?: boolean;
}

export function optimisticDelete<T>(opts: OptimisticDeleteOptions<T>) {
  const cap = opts.label.charAt(0).toUpperCase() + opts.label.slice(1);
  return optimisticAction({
    apply: opts.remove,
    rollback: opts.restore,
    commit: opts.commit,
    successMessage: `${cap} deleted`,
    errorMessage: `Couldn't delete ${opts.label} — restored.`,
    silent: opts.silent,
  });
}
