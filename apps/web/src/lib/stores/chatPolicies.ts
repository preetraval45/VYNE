"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Chat-side policy store covering:
 *
 *   28.1.6 retention            — per-channel auto-delete after N days
 *   28.1.8 customEmoji          — workspace emoji upload (PNG / SVG, ≤ 64 kB)
 *
 * Distinct from the message data path so policy edits don't cause a
 * full chat re-hydrate.
 */

export interface RetentionPolicy {
  /** Channel id this policy applies to. */
  channelId: string;
  /** Auto-delete messages older than N days. 0 = never. */
  retentionDays: number;
  /** When true, messages are archived (read-only) before deletion. */
  archiveBeforeDelete: boolean;
  updatedAt: string;
}

export interface CustomEmoji {
  id: string;
  /** Slug used in markdown — `:rocket-fast:`. Lowercase, alphanumeric + `-`. */
  slug: string;
  /** Image data URL (PNG / SVG ≤ 64 kB). */
  dataUrl: string;
  /** Optional category — Reactions / Brand / Stickers. */
  category?: string;
  uploadedBy?: string;
  uploadedAt: string;
}

interface ChatPoliciesStore {
  retention: RetentionPolicy[];
  emoji: CustomEmoji[];

  // Retention
  setRetention: (
    payload: Omit<RetentionPolicy, "updatedAt">,
  ) => RetentionPolicy;
  clearRetention: (channelId: string) => void;
  retentionFor: (channelId: string) => RetentionPolicy | null;
  /** Returns the cutoff ISO for a given channel — anything older may be GC'd. */
  cutoffFor: (channelId: string) => string | null;

  // Emoji
  uploadEmoji: (
    payload: Omit<CustomEmoji, "id" | "uploadedAt"> & { id?: string },
  ) => CustomEmoji;
  removeEmoji: (id: string) => void;
  emojiBySlug: (slug: string) => CustomEmoji | null;
}

const MAX_EMOJI_BYTES = 64 * 1024;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function approxBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl.length;
  // base64: every 4 chars decode to 3 bytes.
  return Math.ceil(((dataUrl.length - comma - 1) * 3) / 4);
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/^:|:$/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32);
}

export const useChatPolicies = create<ChatPoliciesStore>()(
  persist(
    (set, get) => ({
      retention: [],
      emoji: [],

      setRetention: (payload) => {
        const row: RetentionPolicy = {
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        set((s) => {
          const filtered = s.retention.filter(
            (r) => r.channelId !== payload.channelId,
          );
          return { retention: [row, ...filtered] };
        });
        return row;
      },
      clearRetention: (channelId) =>
        set((s) => ({
          retention: s.retention.filter((r) => r.channelId !== channelId),
        })),
      retentionFor: (channelId) =>
        get().retention.find((r) => r.channelId === channelId) ?? null,
      cutoffFor: (channelId) => {
        const policy = get().retention.find((r) => r.channelId === channelId);
        if (!policy || policy.retentionDays <= 0) return null;
        const cutoff = new Date(
          Date.now() - policy.retentionDays * 24 * 3_600_000,
        );
        return cutoff.toISOString();
      },

      uploadEmoji: (payload) => {
        const slug = normalizeSlug(payload.slug);
        if (!slug) {
          return {
            id: "noop",
            slug: "",
            dataUrl: "",
            uploadedAt: new Date().toISOString(),
          };
        }
        if (approxBytes(payload.dataUrl) > MAX_EMOJI_BYTES) {
          throw new Error("Emoji must be ≤ 64 kB");
        }
        const row: CustomEmoji = {
          id: payload.id ?? newId(),
          slug,
          dataUrl: payload.dataUrl,
          category: payload.category,
          uploadedBy: payload.uploadedBy,
          uploadedAt: new Date().toISOString(),
        };
        set((s) => {
          const filtered = s.emoji.filter((e) => e.slug !== slug);
          return { emoji: [row, ...filtered] };
        });
        return row;
      },
      removeEmoji: (id) =>
        set((s) => ({ emoji: s.emoji.filter((e) => e.id !== id) })),
      emojiBySlug: (slug) =>
        get().emoji.find((e) => e.slug === normalizeSlug(slug)) ?? null,
    }),
    { name: "vyne-chat-policies", version: 1 },
  ),
);

/**
 * Daily GC sweep helper. Walks every channel with a retention policy
 * and returns the message ids to drop / archive. Caller wires this
 * into a daily cron / on-mount hook.
 */
export function reconcileRetention<T extends { id: string; channelId?: string; createdAt?: string }>(
  messages: T[],
): { drop: string[]; archive: string[] } {
  const drop: string[] = [];
  const archive: string[] = [];
  const policies = useChatPolicies.getState().retention;
  if (policies.length === 0) return { drop, archive };
  const policyMap = new Map(policies.map((p) => [p.channelId, p]));
  for (const m of messages) {
    if (!m.channelId || !m.createdAt) continue;
    const policy = policyMap.get(m.channelId);
    if (!policy || policy.retentionDays <= 0) continue;
    const cutoff = Date.now() - policy.retentionDays * 24 * 3_600_000;
    if (new Date(m.createdAt).getTime() < cutoff) {
      if (policy.archiveBeforeDelete) archive.push(m.id);
      else drop.push(m.id);
    }
  }
  return { drop, archive };
}
