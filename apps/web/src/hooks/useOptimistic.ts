"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";

/** Tiny helper for optimistic updates against a Zustand store (or any
 *  other place where the apply / rollback are sync). Shows a toast
 *  on failure and reverts.
 *
 *   const opt = useOptimistic();
 *   opt.run({
 *     apply: () => updateDeal(id, { stage: "Won" }),
 *     rollback: () => updateDeal(id, { stage: prev }),
 *     mutation: () => fetch(...),
 *     successMessage: "Deal moved to Won",
 *     errorMessage: "Couldn't update — restored",
 *   });
 *
 *  Even with a purely-local store, the apply/rollback contract makes
 *  it trivial to add a real network call later: only the `mutation`
 *  changes.
 */
export function useOptimistic() {
  const [pending, setPending] = useState(0);

  const run = useCallback(
    async <T,>(opts: {
      apply: () => void;
      rollback: () => void;
      mutation?: () => Promise<T>;
      successMessage?: string;
      errorMessage?: string;
    }) => {
      opts.apply();
      if (opts.successMessage) {
        // Show success eagerly — UI already reflects the change
        toast.success(opts.successMessage);
      }
      if (!opts.mutation) return;
      setPending((p) => p + 1);
      try {
        await opts.mutation();
      } catch (e) {
        opts.rollback();
        toast.error(opts.errorMessage ?? "Couldn't save — change reverted");
        // Re-throw for callers who want to inspect
        throw e;
      } finally {
        setPending((p) => Math.max(0, p - 1));
      }
    },
    [],
  );

  return { run, pending };
}
