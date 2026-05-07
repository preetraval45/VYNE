"use client";

/**
 * Thread digest helper (28.1.5).
 *
 *   const digest = await getThreadDigest(threadId, replies);
 *
 * Calls the existing `/api/ai/thread-summary` route, caches per
 * thread by `lastReplyId`, and returns a structured digest:
 *
 *   { headline, decision, owner, nextStep, blockers }
 *
 * Cached entries invalidate the moment a new reply id arrives, so a
 * fast-moving thread never shows stale copy. Cache size is capped
 * at 20 threads — beyond that, oldest evicted FIFO.
 */

export interface ThreadDigest {
  threadId: string;
  /** Stable id of the last reply included in this digest — invalidates on new replies. */
  lastReplyId: string;
  headline: string;
  decision?: string;
  owner?: string;
  nextStep?: string;
  blockers?: string[];
  generatedAt: string;
}

const cache = new Map<string, ThreadDigest>();
const MAX_CACHE = 20;

/** Minimum reply count before a digest is even worth requesting. */
export const DIGEST_THRESHOLD = 20;

interface ThreadReply {
  id: string;
  authorName?: string;
  body: string;
  createdAt?: string;
}

interface DigestResponse {
  headline?: string;
  decision?: string;
  owner?: string;
  nextStep?: string;
  blockers?: string[];
}

export async function getThreadDigest(
  threadId: string,
  replies: ThreadReply[],
): Promise<ThreadDigest | null> {
  if (replies.length < DIGEST_THRESHOLD) return null;
  const lastReplyId = replies[replies.length - 1]?.id ?? "";
  const cached = cache.get(threadId);
  if (cached && cached.lastReplyId === lastReplyId) return cached;

  try {
    const res = await fetch("/api/ai/thread-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId,
        replies: replies.slice(-60).map((r) => ({
          author: r.authorName,
          body: r.body,
          ts: r.createdAt,
        })),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DigestResponse;
    if (!data.headline) return null;
    const row: ThreadDigest = {
      threadId,
      lastReplyId,
      headline: data.headline,
      decision: data.decision,
      owner: data.owner,
      nextStep: data.nextStep,
      blockers: data.blockers,
      generatedAt: new Date().toISOString(),
    };
    cache.set(threadId, row);
    if (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    return row;
  } catch {
    return null;
  }
}

export function invalidateThreadDigest(threadId: string): void {
  cache.delete(threadId);
}

export function clearThreadDigests(): void {
  cache.clear();
}
