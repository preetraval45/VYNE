"use client";

import { parseQuery as parseGlobal, type ChipKey } from "@/lib/search/queryChips";

/**
 * Chat-specific search chip parser (28.1.1).
 *
 * Reuses the global Phase 14 parser (`parseQuery`) so the chip
 * vocabulary stays consistent across Cmd+K, the global modal, and
 * chat. Adds chat-only filters on top: `has:link / has:file /
 * has:image / has:reaction / mentions:me`.
 *
 *   const filter = parseChatQuery("from:sarah in:#sales has:link recap");
 *   // → { text: "recap", chips: { from: "sarah", in: "#sales", has: "link" } }
 *
 *   const matches = filterMessages(messages, filter, { meId, currentChannelId });
 */

export type ChatChipKey = ChipKey | "has" | "mentions";

export interface ChatQuery {
  text: string;
  chips: Partial<Record<ChatChipKey, string>>;
}

const CHAT_ONLY_RE =
  /(^|\s)(has|mentions):("[^"]+"|\S+)/gi;

/** Strip every `has:` / `mentions:` chip out of a string + return them. */
function pluckChatChips(raw: string): {
  rest: string;
  chips: Partial<Record<ChatChipKey, string>>;
} {
  const chips: Partial<Record<ChatChipKey, string>> = {};
  const rest = raw.replace(CHAT_ONLY_RE, (_full, leading, key, value) => {
    let v = value;
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    chips[key.toLowerCase() as ChatChipKey] = v.toLowerCase();
    return leading;
  });
  return { rest: rest.replace(/\s+/g, " ").trim(), chips };
}

export function parseChatQuery(raw: string): ChatQuery {
  if (!raw) return { text: "", chips: {} };
  const { rest, chips: chatChips } = pluckChatChips(raw);
  const global = parseGlobal(rest);
  return {
    text: global.text,
    chips: { ...global.chips, ...chatChips } as ChatQuery["chips"],
  };
}

// ── Predicates ───────────────────────────────────────────────────

export interface MessageLite {
  id: string;
  channelId?: string;
  /** Author name or id — `from:` matches against this. */
  authorName?: string;
  authorId?: string;
  content?: string;
  /** ISO. */
  createdAt?: string;
  /** Truthy when message has at least one link. */
  attachments?: Array<{ type?: string; url?: string }>;
  /** Reaction map. */
  reactions?: Array<{ emoji?: string; count?: number }>;
  /** @mention ids referenced in the message. */
  mentions?: string[];
}

export interface FilterContext {
  meId?: string;
  /** Map of channel id → display name (so `in:#sales` works). */
  channelById?: Map<string, string>;
}

function matchesText(msg: MessageLite, text: string): boolean {
  if (!text) return true;
  const haystack = (msg.content ?? "").toLowerCase();
  return haystack.includes(text.toLowerCase());
}

function matchesFrom(msg: MessageLite, value: string): boolean {
  const v = value.toLowerCase();
  return (
    (msg.authorName ?? "").toLowerCase().includes(v) ||
    (msg.authorId ?? "").toLowerCase() === v
  );
}

function matchesIn(
  msg: MessageLite,
  value: string,
  ctx: FilterContext,
): boolean {
  if (!msg.channelId) return false;
  const wanted = value.replace(/^#/, "").toLowerCase();
  if (msg.channelId.toLowerCase() === wanted) return true;
  const name = ctx.channelById?.get(msg.channelId);
  if (!name) return false;
  return name.replace(/^#/, "").toLowerCase() === wanted;
}

function matchesDate(
  msg: MessageLite,
  before?: string,
  after?: string,
): boolean {
  if (!msg.createdAt) return true;
  const t = new Date(msg.createdAt).getTime();
  if (before) {
    const b = parseRelDate(before);
    if (b !== null && t >= b) return false;
  }
  if (after) {
    const a = parseRelDate(after);
    if (a !== null && t <= a) return false;
  }
  return true;
}

/**
 * Parse `before:` / `after:` values. Accepts ISO ("2026-04-01"),
 * shorthand ("yesterday" / "today" / "Nd" / "Nw"), or any input
 * `Date.parse` understands. Returns ms since epoch or null on
 * unparseable input (the predicate then matches everything).
 */
function parseRelDate(input: string): number | null {
  const v = input.trim().toLowerCase();
  if (!v) return null;
  const now = Date.now();
  if (v === "today") {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  }
  if (v === "yesterday") return now - 24 * 3_600_000;
  const rel = /^(\d+)([dwmy])$/.exec(v);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const mul =
      unit === "d"
        ? 24 * 3_600_000
        : unit === "w"
          ? 7 * 24 * 3_600_000
          : unit === "m"
            ? 30 * 24 * 3_600_000
            : 365 * 24 * 3_600_000;
    return now - n * mul;
  }
  const parsed = Date.parse(v);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesHas(msg: MessageLite, value: string): boolean {
  switch (value) {
    case "link":
      return /(https?:\/\/|www\.)/i.test(msg.content ?? "");
    case "file":
      return Boolean(
        msg.attachments?.some(
          (a) => a.type && !a.type.startsWith("image/"),
        ),
      );
    case "image":
      return Boolean(
        msg.attachments?.some((a) => a.type?.startsWith("image/")),
      );
    case "reaction":
      return Boolean(msg.reactions && msg.reactions.length > 0);
    case "attachment":
      return Boolean(msg.attachments && msg.attachments.length > 0);
    default:
      return false;
  }
}

function matchesMentions(
  msg: MessageLite,
  value: string,
  ctx: FilterContext,
): boolean {
  const v = value.toLowerCase();
  const target = v === "me" ? (ctx.meId ?? "").toLowerCase() : v;
  if (!target) return false;
  return Boolean(msg.mentions?.some((m) => m.toLowerCase() === target));
}

/**
 * Apply the parsed query to a message list. Returns the subset that
 * matches every active chip (AND across chips, OR-implicit on text).
 */
export function filterMessages<T extends MessageLite>(
  messages: T[],
  query: ChatQuery,
  ctx: FilterContext = {},
): T[] {
  const { text, chips } = query;
  if (!text && Object.keys(chips).length === 0) return messages;
  return messages.filter((m) => {
    if (!matchesText(m, text)) return false;
    if (chips.from && !matchesFrom(m, chips.from)) return false;
    if (chips.in && !matchesIn(m, chips.in, ctx)) return false;
    if (
      (chips.before || chips.after) &&
      !matchesDate(m, chips.before, chips.after)
    )
      return false;
    if (chips.has && !matchesHas(m, chips.has)) return false;
    if (chips.mentions && !matchesMentions(m, chips.mentions, ctx))
      return false;
    return true;
  });
}
