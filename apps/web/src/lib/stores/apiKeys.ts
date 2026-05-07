"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * API keys with scopes + rate limit (21.7).
 *
 *   const k = createKey({
 *     name: "Zapier integration",
 *     scopes: ["deals:read", "deals:write"],
 *     rateLimitPerMin: 60,
 *   });
 *   // k.token = "vyne_sk_… (only returned at creation)"
 *
 * Tokens are visible exactly once at creation (the store keeps a
 * SHA-256 hash for verification). Per-key rate-limit + scope list
 * lets admins lock down an integration to read-only or a single
 * module without a separate user account.
 */

export type ApiScope =
  // canonical "{module}:{action}" pairs
  | "deals:read"
  | "deals:write"
  | "tasks:read"
  | "tasks:write"
  | "projects:read"
  | "projects:write"
  | "contacts:read"
  | "contacts:write"
  | "invoices:read"
  | "invoices:write"
  | "products:read"
  | "products:write"
  | "automations:read"
  | "automations:write"
  | "webhooks:write"
  | "ai:invoke"
  | "*";

export interface ApiKey {
  id: string;
  name: string;
  /** Last 4 chars of the token for display. */
  last4: string;
  /** SHA-256 hex of the full token. Used by the verifier. */
  hash: string;
  scopes: ApiScope[];
  /** Per-minute rate limit. 0 = unlimited. */
  rateLimitPerMin: number;
  enabled: boolean;
  createdAt: string;
  /** ISO of the most recent successful request. */
  lastUsedAt?: string;
  /** Optional expiry. */
  expiresAt?: string;
}

interface ApiKeysStore {
  keys: ApiKey[];
  /** Returns the row + the **plaintext token** (only shown once). */
  createKey: (
    payload: Omit<ApiKey, "id" | "hash" | "last4" | "createdAt" | "enabled"> & {
      enabled?: boolean;
    },
  ) => Promise<{ key: ApiKey; token: string }>;
  removeKey: (id: string) => void;
  toggleKey: (id: string) => void;
  recordUse: (id: string) => void;
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function generateToken(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `vyne_sk_${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return `vyne_sk_${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function sha256(token: string): Promise<string> {
  if (typeof crypto !== "undefined" && "subtle" in crypto) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback: cheap (non-crypto) hash so tests work in JSDOM.
  let h = 5381;
  for (let i = 0; i < token.length; i++) h = (h * 33 + token.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export const useApiKeys = create<ApiKeysStore>()(
  persist(
    (set) => ({
      keys: [],
      createKey: async (payload) => {
        const token = generateToken();
        const hash = await sha256(token);
        const row: ApiKey = {
          id: newId(),
          name: payload.name.slice(0, 80) || "Untitled key",
          last4: token.slice(-4),
          hash,
          scopes: payload.scopes.length > 0 ? payload.scopes : ["*"],
          rateLimitPerMin: Math.max(0, payload.rateLimitPerMin ?? 60),
          enabled: payload.enabled ?? true,
          createdAt: new Date().toISOString(),
          expiresAt: payload.expiresAt,
        };
        set((s) => ({ keys: [row, ...s.keys] }));
        return { key: row, token };
      },
      removeKey: (id) =>
        set((s) => ({ keys: s.keys.filter((k) => k.id !== id) })),
      toggleKey: (id) =>
        set((s) => ({
          keys: s.keys.map((k) =>
            k.id === id ? { ...k, enabled: !k.enabled } : k,
          ),
        })),
      recordUse: (id) =>
        set((s) => ({
          keys: s.keys.map((k) =>
            k.id === id ? { ...k, lastUsedAt: new Date().toISOString() } : k,
          ),
        })),
    }),
    { name: "vyne-api-keys", version: 1 },
  ),
);

/** Server-side helper: verify a presented token against the live store
 *  + check it carries the requested scope. Browser-only — production
 *  ports this to a database lookup. */
export async function verifyApiKey(
  token: string,
  required: ApiScope,
): Promise<{ ok: boolean; key?: ApiKey; reason?: string }> {
  const hash = await sha256(token);
  const row = useApiKeys
    .getState()
    .keys.find((k) => k.hash === hash);
  if (!row) return { ok: false, reason: "unknown token" };
  if (!row.enabled) return { ok: false, key: row, reason: "disabled" };
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false, key: row, reason: "expired" };
  }
  const scopeOk =
    row.scopes.includes("*") || row.scopes.includes(required);
  if (!scopeOk) return { ok: false, key: row, reason: "scope" };
  return { ok: true, key: row };
}
