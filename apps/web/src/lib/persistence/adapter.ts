"use client";

/**
 * Backend persistence adapter.
 *
 * Today VYNE persists every Zustand store to localStorage. That gives a
 * great per-browser experience but no cross-device sync, no team
 * collaboration, and no audit history. This module is the swap point
 * for moving to a real backend without rewriting every store.
 *
 * The recommended free path: Supabase.
 *   1. Create a project at https://supabase.com
 *   2. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   3. Run the SQL in /docs/supabase-schema.sql (see doc) to create
 *      tables matching the Zustand store shapes
 *   4. Set PERSISTENCE_PROVIDER = "supabase"
 *   5. pnpm add @supabase/supabase-js @supabase/auth-helpers-react
 *
 * Each Zustand store can then opt-in by replacing its `persist({name})`
 * config with `persistRemote(name, schema)` from this file. We keep
 * localStorage as a write-through cache so the UI stays instant, with
 * Supabase as the source of truth on read.
 *
 * For now this file just centralises the toggle — actual SDK wiring is
 * commented in below. Until enabled, all stores keep using localStorage.
 */

export type PersistenceProvider = "local" | "supabase" | "vercel-kv" | "upstash";

export function activePersistenceProvider(): PersistenceProvider {
  if (typeof process === "undefined") return "local";
  const v = (
    process.env.NEXT_PUBLIC_PERSISTENCE_PROVIDER ?? "local"
  ).toLowerCase();
  if (v === "supabase" || v === "vercel-kv" || v === "upstash") return v;
  return "local";
}

/**
 * Read a row from the configured backend. Returns null when no backend
 * is configured (callers should fall through to local storage).
 *
 * Schema convention: `{ namespace }/{ key }`. Namespace = store name
 * (e.g. "vyne-sent-messages"), key = optional sub-key (channelId).
 */
export async function readRemote<T>(
  namespace: string,
  key: string,
): Promise<T | null> {
  const provider = activePersistenceProvider();
  if (provider === "local") return null;

  // Supabase example (uncomment after pnpm add @supabase/supabase-js):
  //
  //   import { createClient } from "@supabase/supabase-js";
  //   const sb = createClient(
  //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   );
  //   const { data } = await sb
  //     .from("vyne_kv")
  //     .select("value")
  //     .eq("ns", namespace)
  //     .eq("k", key)
  //     .single();
  //   return (data?.value as T) ?? null;

  void namespace;
  void key;
  return null;
}

/** Write to the configured backend. No-op for "local". */
export async function writeRemote<T>(
  namespace: string,
  key: string,
  value: T,
): Promise<void> {
  const provider = activePersistenceProvider();
  if (provider === "local") return;

  // Supabase example:
  //   await sb.from("vyne_kv").upsert({ ns: namespace, k: key, value });
  void namespace;
  void key;
  void value;
}

/**
 * Subscribe to remote changes for cross-device live sync. Returns an
 * unsubscribe function. No-op for "local".
 *
 * Supabase Realtime example:
 *   const ch = sb.channel(`kv:${namespace}:${key}`)
 *     .on("postgres_changes", { event: "*", schema: "public", table: "vyne_kv", filter: `ns=eq.${namespace}` },
 *         (p) => onChange(p.new.value))
 *     .subscribe();
 *   return () => sb.removeChannel(ch);
 */
export function subscribeRemote<T>(
  namespace: string,
  key: string,
  onChange: (value: T) => void,
): () => void {
  const provider = activePersistenceProvider();
  if (provider === "local") return () => {};
  void namespace;
  void key;
  void onChange;
  return () => {};
}
