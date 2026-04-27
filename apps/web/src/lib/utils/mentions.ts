"use client";

import React from "react";

/**
 * Render plain text with @mentions visually highlighted.
 * Recognizes:
 *  - @channel / @here  → orange notify pills
 *  - @Name             → purple chips
 * Returns an array of React nodes to embed inline in a paragraph.
 */
const MENTION_RE = /@([\w.-]+(?:\s[\w.-]+)?)/g;

export function renderWithMentions(content: string): React.ReactNode[] {
  if (!content) return [];
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  // Note: cloning regex to keep it stateless.
  const re = new RegExp(MENTION_RE.source, "g");
  while ((match = re.exec(content)) !== null) {
    const idx = match.index;
    if (idx > last) nodes.push(content.slice(last, idx));
    const name = match[1];
    const isBroadcast = name === "channel" || name === "here";
    nodes.push(
      React.createElement(
        "span",
        {
          key: `${idx}-${name}`,
          style: {
            display: "inline-block",
            padding: "1px 7px",
            margin: "0 1px",
            borderRadius: 6,
            background: isBroadcast
              ? "rgba(245, 158, 11, 0.15)"
              : "rgba(108, 71, 255, 0.15)",
            color: isBroadcast ? "#F59E0B" : "var(--vyne-purple)",
            fontWeight: 600,
            fontSize: "0.95em",
          },
        },
        `@${name}`,
      ),
    );
    last = idx + match[0].length;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
}

/** Returns true if the text mentions the current user (by name or id). */
export function isUserMentioned(content: string, userNames: string[]): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  if (lower.includes("@channel") || lower.includes("@here")) return true;
  return userNames.some((n) => lower.includes(`@${n.toLowerCase()}`));
}
