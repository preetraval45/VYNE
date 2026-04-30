"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, X, ChevronDown } from "lucide-react";
import type { MsgMessage } from "@/lib/api/client";

interface Props {
  channelId: string;
  channelName?: string;
  messages: MsgMessage[];
  /** Username strings to detect direct mentions. */
  myNames?: string[];
  onDismiss?: () => void;
}

interface Catchup {
  headline: string;
  bullets: string[];
  mentionCount: number;
}

/**
 * Sticky banner at the top of the message list. Generates an AI summary
 * of the messages the user missed since `lastReadAt`. Click "Brief me"
 * to expand; tap × to dismiss for this channel session.
 *
 * Renders nothing when there are no unread messages.
 */
export function SmartCatchupBar({
  channelId,
  channelName,
  messages,
  myNames = ["You"],
  onDismiss,
}: Props) {
  // Track last-seen timestamp per channel in localStorage so the
  // catch-up bar persists across browser sessions/tabs — otherwise
  // every new tab re-shows the same banner.
  const [lastReadAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const k = `vyne-catchup-seen:${channelId}`;
    const stored = window.localStorage.getItem(k);
    // Mark "now" as seen so subsequent messages count as unread.
    window.localStorage.setItem(k, String(Date.now()));
    return stored ? Number(stored) : 0;
  });

  const unread = useMemo(() => {
    if (!lastReadAt) return [];
    return messages.filter((m) => {
      const t = new Date(m.createdAt).getTime();
      return t > lastReadAt && m.author.id !== "me";
    });
  }, [messages, lastReadAt]);

  const mentionsMe = useMemo(() => {
    return unread.filter((m) =>
      myNames.some((n) =>
        m.content.toLowerCase().includes(`@${n.toLowerCase()}`),
      ),
    ).length;
  }, [unread, myNames]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Catchup | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    setData(null);
    setOpen(false);
  }, [channelId]);

  if (dismissed) return null;
  if (unread.length < 3) return null;

  async function brief() {
    if (data) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch("/api/ai/catchup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName,
          myName: myNames[0],
          messages: unread.slice(0, 80).map((m) => ({
            author: m.author.name,
            content: m.content,
            ts: m.createdAt,
            mentionsMe: myNames.some((n) =>
              m.content.toLowerCase().includes(`@${n.toLowerCase()}`),
            ),
          })),
        }),
      });
      const json = (await res.json()) as Catchup;
      setData(json);
    } catch {
      setData({
        headline: `${unread.length} unread, ${mentionsMe} mention${mentionsMe === 1 ? "" : "s"} you.`,
        bullets: [],
        mentionCount: mentionsMe,
      });
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div
      role="status"
      aria-label="Smart catch-up"
      style={{
        margin: "8px 12px 0",
        background:
          "linear-gradient(135deg, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10) 0%, rgba(124,77,255,0.08) 100%)",
        border: "1px solid rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.32)",
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background:
              "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {unread.length} unread
            {mentionsMe > 0 ? (
              <span style={{ color: "var(--vyne-teal)" }}>
                {" "}
                · {mentionsMe} mention{mentionsMe === 1 ? "" : "s"} you
              </span>
            ) : null}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-tertiary)",
              marginTop: 1,
            }}
          >
            {data?.headline ?? "Tap Brief me for an AI-summarized catch-up."}
          </div>
        </div>
        <button
          type="button"
          onClick={brief}
          aria-expanded={open}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--vyne-teal)",
            background: "var(--vyne-teal)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          {loading
            ? "Briefing…"
            : open && data
              ? "Hide"
              : data
                ? "Show"
                : "Brief me"}
          {data && (
            <ChevronDown
              size={11}
              style={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.18s",
              }}
            />
          )}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss catch-up"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={13} />
        </button>
      </div>
      {open && data && data.bullets.length > 0 && (
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {data.bullets.map((b, i) => (
            <li
              key={i}
              style={{
                fontSize: 12.5,
                lineHeight: 1.5,
                color: "var(--text-primary)",
              }}
            >
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
