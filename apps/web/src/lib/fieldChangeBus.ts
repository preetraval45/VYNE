"use client";

/**
 * Field-level change subscription bus (20.10).
 *
 *   const off = subscribeFieldChange("deal.value", (e) => {
 *     if (e.next > 10_000 && e.prev <= 10_000) fire("deal.value-crossed-10k");
 *   });
 *
 *   emitFieldChange({
 *     entity: "deal",
 *     entityId: "DEAL-42",
 *     field: "value",
 *     prev: 7500,
 *     next: 12000,
 *     actor: "sarah@",
 *   });
 *
 * Every store mutation that wants automation triggers calls
 * `emitFieldChange`; subscribers register against either a specific
 * `entity.field` key or the wildcard `entity.*` to react in batch.
 *
 * Synchronous + in-process: no network, no queue. For cross-tab
 * propagation pair with the existing realtime layer (Pusher) and
 * call `emitFieldChange` on the receiver too.
 */

export interface FieldChangeEvent<T = unknown> {
  entity: string;
  entityId: string;
  field: string;
  prev: T;
  next: T;
  actor?: string;
  /** ISO. Auto-set when omitted. */
  ts?: string;
}

export type FieldChangeHandler = (event: FieldChangeEvent) => void;

interface Subscription {
  pattern: string;
  handler: FieldChangeHandler;
}

const subs = new Set<Subscription>();

function matches(pattern: string, key: string): boolean {
  if (pattern === key) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return key.startsWith(`${prefix}.`);
  }
  if (pattern === "*") return true;
  return false;
}

/**
 * Subscribe to changes on `<entity>.<field>` (`deal.value`),
 * `<entity>.*` (every field on a deal), or `*` (every field on every
 * entity). Returns an unsubscribe fn.
 */
export function subscribeFieldChange(
  pattern: string,
  handler: FieldChangeHandler,
): () => void {
  const sub: Subscription = { pattern, handler };
  subs.add(sub);
  return () => subs.delete(sub);
}

/** Fire a change event. No-op when prev === next (referential). */
export function emitFieldChange<T>(event: FieldChangeEvent<T>): void {
  if (event.prev === event.next) return;
  const ts = event.ts ?? new Date().toISOString();
  const key = `${event.entity}.${event.field}`;
  const payload: FieldChangeEvent = { ...event, ts };
  for (const { pattern, handler } of Array.from(subs)) {
    if (matches(pattern, key)) {
      try {
        handler(payload);
      } catch (err) {
        // Subscribers shouldn't kill emitters.
        console.warn("[fieldChangeBus] handler threw", err);
      }
    }
  }
}

/** Drop every subscription. Useful in tests. */
export function clearFieldChangeBus(): void {
  subs.clear();
}
