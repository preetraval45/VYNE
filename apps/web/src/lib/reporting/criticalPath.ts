/**
 * Critical-path computation for Gantt charts (22.5).
 *
 *   const path = criticalPath(tasks);
 *   // → Set<taskId> — every task that lies on the longest dependent chain.
 *
 * Each task carries an `id`, optional `dependencies: string[]` (ids
 * that must complete first), and a `duration` in any unit (the unit
 * doesn't matter — the function returns the longest chain by sum).
 *
 * Algorithm: standard CPM forward pass — earliest-start + earliest-
 * finish per node, then walk the longest chain back from the node
 * with the largest earliest-finish.
 */

export interface PathTask {
  id: string;
  duration: number;
  dependencies?: string[];
}

export interface CriticalPathResult {
  /** Every task id on the longest path. Highlight these in the UI. */
  ids: Set<string>;
  /** Sum of durations along the path. */
  length: number;
  /** Ordered chain of ids (root → leaf). */
  chain: string[];
}

export function criticalPath(tasks: readonly PathTask[]): CriticalPathResult {
  if (tasks.length === 0) return { ids: new Set(), length: 0, chain: [] };
  const map = new Map<string, PathTask>(tasks.map((t) => [t.id, t]));

  // Memoised earliest-finish + predecessor for path reconstruction.
  const ef = new Map<string, number>();
  const pred = new Map<string, string | null>();
  const stack = new Set<string>(); // cycle guard

  function visit(id: string): number {
    const task = map.get(id);
    if (!task) return 0;
    const cached = ef.get(id);
    if (cached !== undefined) return cached;
    if (stack.has(id)) return 0; // cycle — bail
    stack.add(id);
    let bestPrev = 0;
    let bestPrevId: string | null = null;
    for (const dep of task.dependencies ?? []) {
      const v = visit(dep);
      if (v > bestPrev) {
        bestPrev = v;
        bestPrevId = dep;
      }
    }
    stack.delete(id);
    const finish = bestPrev + task.duration;
    ef.set(id, finish);
    pred.set(id, bestPrevId);
    return finish;
  }

  let leaf = tasks[0].id;
  let max = 0;
  for (const t of tasks) {
    const v = visit(t.id);
    if (v > max) {
      max = v;
      leaf = t.id;
    }
  }

  const chain: string[] = [];
  let cur: string | null = leaf;
  while (cur) {
    chain.unshift(cur);
    cur = pred.get(cur) ?? null;
  }
  return { ids: new Set(chain), length: max, chain };
}
