"use client";

/**
 * Client-side wrapper around `/workers/compute.js`.
 *
 *   const rows = await compute("csv-parse", { text: csvBlob });
 *
 * Internally maintains a single shared worker per tab so the cold-
 * start penalty (~80 ms) only ever happens once. Each call gets a
 * unique id; responses are matched by id and the matching pending
 * promise is resolved / rejected.
 */

export type ComputeOp =
  | "csv-parse"
  | "csv-stringify"
  | "aggregate"
  | "histogram"
  | "dedupe-fingerprint";

let _worker: Worker | null = null;
let _bootResolved = false;
const pending = new Map<
  string,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();

function ensureWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (_worker) return _worker;
  if (typeof Worker === "undefined") return null;
  try {
    _worker = new Worker("/workers/compute.js");
  } catch {
    _worker = null;
    return null;
  }
  _worker.addEventListener("message", (event: MessageEvent) => {
    const data = event.data as {
      id: string;
      ok: boolean;
      result?: unknown;
      error?: string;
    };
    if (data?.id === "boot") {
      _bootResolved = true;
      return;
    }
    const slot = pending.get(data.id);
    if (!slot) return;
    pending.delete(data.id);
    if (data.ok) slot.resolve(data.result);
    else slot.reject(new Error(data.error ?? "compute worker error"));
  });
  _worker.addEventListener("error", (err) => {
    // Reject all in-flight calls so the caller can fall back.
    for (const [, slot] of pending) {
      slot.reject(new Error(err.message ?? "compute worker error"));
    }
    pending.clear();
  });
  return _worker;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Run `op` in the worker. Falls back to running synchronously on the
 * main thread when Workers aren't available (SSR, ancient browsers).
 * The fallback uses a tiny inline parser so callers can rely on the
 * same return shape.
 */
export async function compute<T = unknown>(
  op: ComputeOp,
  payload: unknown,
): Promise<T> {
  const worker = ensureWorker();
  if (!worker) {
    return runFallback(op, payload) as T;
  }
  return new Promise<T>((resolve, reject) => {
    const id = newId();
    pending.set(id, {
      resolve: (v) => resolve(v as T),
      reject,
    });
    worker.postMessage({ id, op, payload });
    // 30 s timeout so a runaway op doesn't leak forever.
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`compute op "${op}" timed out`));
      }
    }, 30_000);
  });
}

/** Has the worker booted yet? Useful for warm-up flags. */
export function isWorkerReady(): boolean {
  ensureWorker();
  return _bootResolved;
}

function runFallback(op: ComputeOp, payload: unknown): unknown {
  // Minimal main-thread fallback for the two most common ops. Other
  // ops just throw so the caller knows to handle gracefully.
  switch (op) {
    case "csv-parse": {
      const text = String(
        (payload as { text?: string } | null)?.text ?? "",
      );
      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      if (lines.length === 0) return { headers: [], rows: [] };
      const headers = lines[0].split(",");
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(",");
        const row: Record<string, string> = {};
        for (let c = 0; c < headers.length; c++) {
          row[headers[c]] = cells[c] ?? "";
        }
        rows.push(row);
      }
      return { headers, rows };
    }
    case "csv-stringify": {
      const rows =
        (payload as { rows?: Record<string, unknown>[] } | null)?.rows ?? [];
      if (rows.length === 0) return "";
      const headers = Object.keys(rows[0]);
      return [
        headers.join(","),
        ...rows.map((r) => headers.map((h) => String(r[h] ?? "")).join(",")),
      ].join("\n");
    }
    default:
      throw new Error(`compute fallback not implemented for "${op}"`);
  }
}
