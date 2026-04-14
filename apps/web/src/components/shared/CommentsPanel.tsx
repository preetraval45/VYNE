"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, Reply, MoreHorizontal, Check } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";

export interface ThreadMessage {
  id: string;
  author: { id: string; name: string; color?: string };
  body: string;
  createdAt: string;
  parentId?: string;
  resolved?: boolean;
}

interface Props {
  /** Entity identifier, e.g. "issue:ENG-43" or "doc:doc-123" */
  subjectId: string;
  label?: string;
  initialMessages?: ThreadMessage[];
}

const STORAGE_PREFIX = "vyne-threads-";

function loadThread(id: string): ThreadMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return [];
    return JSON.parse(raw) as ThreadMessage[];
  } catch {
    return [];
  }
}

function saveThread(id: string, messages: ThreadMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(messages));
  } catch {
    // storage full — ignore
  }
}

function relative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function avatarColor(id: string): string {
  const colors = [
    "#6C47FF",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#3B82F6",
    "#EC4899",
    "#8B5CF6",
    "#14B8A6",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CommentsPanel({ subjectId, label = "Comments", initialMessages }: Props) {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ThreadMessage[]>(
    initialMessages ?? [],
  );
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadThread(subjectId);
    if (loaded.length > 0) setMessages(loaded);
    else if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  useEffect(() => {
    saveThread(subjectId, messages);
  }, [subjectId, messages]);

  const addMessage = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const authorId = user?.id ?? "anonymous";
    const authorName = user?.name ?? "Guest";
    const msg: ThreadMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: { id: authorId, name: authorName, color: avatarColor(authorId) },
      body: text,
      createdAt: new Date().toISOString(),
      parentId: replyTo ?? undefined,
    };
    setMessages((prev) => [...prev, msg]);
    setDraft("");
    setReplyTo(null);
  }, [draft, replyTo, user]);

  const toggleResolved = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, resolved: !m.resolved } : m)),
    );
  }, []);

  // Group by parent → list of replies
  const { rootMessages, repliesByParent } = useMemo(() => {
    const roots = messages.filter((m) => !m.parentId);
    const replies = new Map<string, ThreadMessage[]>();
    for (const m of messages) {
      if (m.parentId) {
        const list = replies.get(m.parentId) ?? [];
        list.push(m);
        replies.set(m.parentId, list);
      }
    }
    return { rootMessages: roots, repliesByParent: replies };
  }, [messages]);

  const replyTarget = replyTo
    ? messages.find((m) => m.id === replyTo)
    : undefined;

  return (
    <section
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 14,
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        background: "var(--content-bg)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingBottom: 10,
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        <MessageCircle size={14} style={{ color: "var(--vyne-purple)" }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            padding: "2px 8px",
            borderRadius: 999,
            background: "var(--content-secondary)",
          }}
        >
          {messages.length}
        </span>
      </header>

      {/* Messages */}
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: 340,
          overflow: "auto",
        }}
      >
        {rootMessages.length === 0 && (
          <li
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-tertiary)",
              padding: "20px 0",
            }}
          >
            No comments yet — start the conversation.
          </li>
        )}
        {rootMessages.map((m) => {
          const replies = repliesByParent.get(m.id) ?? [];
          return (
            <li key={m.id}>
              <Comment
                msg={m}
                isReply={false}
                onReply={() => setReplyTo(m.id)}
                onToggleResolved={() => toggleResolved(m.id)}
              />
              {replies.length > 0 && (
                <ol
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "8px 0 0 32px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderLeft: "2px solid var(--content-border)",
                    paddingLeft: 12,
                  }}
                >
                  {replies.map((r) => (
                    <li key={r.id}>
                      <Comment
                        msg={r}
                        isReply
                        onReply={() => setReplyTo(m.id)}
                        onToggleResolved={() => toggleResolved(r.id)}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addMessage();
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 10,
          borderRadius: 10,
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
        }}
      >
        {replyTarget && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(108,71,255,0.08)",
              fontSize: 11,
              color: "var(--text-secondary)",
            }}
          >
            Replying to <strong>{replyTarget.author.name}</strong>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              addMessage();
            }
          }}
          placeholder="Add a comment… (⌘+Enter to send)"
          aria-label="Comment"
          rows={2}
          style={{
            resize: "vertical",
            minHeight: 40,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Threaded · resolves when checked
          </span>
          <button
            type="submit"
            disabled={!draft.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: draft.trim()
                ? "var(--vyne-purple)"
                : "var(--content-border)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: draft.trim() ? "pointer" : "default",
            }}
          >
            <Send size={12} /> Post
          </button>
        </div>
      </form>
    </section>
  );
}

interface CommentProps {
  msg: ThreadMessage;
  isReply: boolean;
  onReply: () => void;
  onToggleResolved: () => void;
}

function Comment({ msg, isReply, onReply, onToggleResolved }: CommentProps) {
  const color = msg.author.color ?? avatarColor(msg.author.id);
  return (
    <article
      style={{
        display: "flex",
        gap: 10,
        opacity: msg.resolved ? 0.6 : 1,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: isReply ? 24 : 28,
          height: isReply ? 24 : 28,
          borderRadius: "50%",
          background: color,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {initials(msg.author.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {msg.author.name}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {relative(msg.createdAt)}
          </span>
          {msg.resolved && (
            <span
              style={{
                padding: "1px 8px",
                borderRadius: 999,
                background: "var(--badge-success-bg)",
                color: "var(--badge-success-text)",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              Resolved
            </span>
          )}
        </header>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text-primary)",
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            textDecoration: msg.resolved ? "line-through" : "none",
          }}
        >
          {msg.body}
        </p>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          <button
            type="button"
            onClick={onReply}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              border: "none",
              background: "transparent",
              color: "var(--text-tertiary)",
              fontSize: 11,
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            <Reply size={11} /> Reply
          </button>
          <button
            type="button"
            onClick={onToggleResolved}
            aria-label={msg.resolved ? "Reopen comment" : "Resolve comment"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              border: "none",
              background: "transparent",
              color: msg.resolved
                ? "var(--badge-success-text)"
                : "var(--text-tertiary)",
              fontSize: 11,
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            <Check size={11} /> {msg.resolved ? "Reopen" : "Resolve"}
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="More options"
        style={{
          width: 24,
          height: 24,
          border: "none",
          background: "transparent",
          color: "var(--text-tertiary)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        <MoreHorizontal size={13} />
      </button>
    </article>
  );
}
