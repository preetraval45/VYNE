"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, FileText, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useMessages } from "@/hooks/useMessages";
import type { MsgMessage } from "@/lib/api/client";
import { UserAvatar } from "./UserAvatar";
import { MessageRow } from "./MessageRow";
import { MessageComposer } from "./MessageComposer";

interface MeetingNotes {
  title: string;
  attendees: string[];
  decisions: string[];
  actionItems: Array<{ owner: string; task: string; due?: string }>;
  summary: string;
}

interface ThreadPanelProps {
  readonly parentMsg: MsgMessage;
  readonly onClose: () => void;
}

export function ThreadPanel({ parentMsg, onClose }: ThreadPanelProps) {
  const { messages, sendMessage, sendTyping, typingUsers } = useMessages(
    parentMsg.channelId ?? null,
    false,
  );
  const replies = messages.filter((m) => m.parentMessageId === parentMsg.id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<MeetingNotes | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesProvider, setNotesProvider] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  const captureNotes = useCallback(async () => {
    setNotesLoading(true);
    setCopied(false);
    try {
      const transcript = [
        {
          author: parentMsg.author.name,
          text: parentMsg.content ?? "",
          ts: parentMsg.createdAt,
        },
        ...replies.map((r) => ({
          author: r.author.name,
          text: r.content ?? "",
          ts: r.createdAt,
        })),
      ].filter((m) => m.text.trim().length > 0);

      if (transcript.length === 0) {
        setNotesProvider("demo");
        setNotes({
          title: "Empty thread",
          attendees: [],
          decisions: [],
          actionItems: [],
          summary: "No messages to summarise yet.",
        });
        return;
      }

      const res = await fetch("/api/ai/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadTitle: parentMsg.content?.slice(0, 80) ?? "Thread",
          messages: transcript,
        }),
      });
      const data = (await res.json()) as {
        notes: MeetingNotes;
        provider: string;
      };
      setNotes(data.notes);
      setNotesProvider(data.provider);
    } catch {
      // ignore
    } finally {
      setNotesLoading(false);
    }
  }, [parentMsg, replies]);

  const copyNotes = useCallback(async () => {
    if (!notes) return;
    const md = [
      `# ${notes.title}`,
      "",
      `**Attendees:** ${notes.attendees.join(", ") || "—"}`,
      "",
      "## Decisions",
      ...(notes.decisions.length
        ? notes.decisions.map((d) => `- ${d}`)
        : ["- (none)"]),
      "",
      "## Action items",
      ...(notes.actionItems.length
        ? notes.actionItems.map(
            (a) =>
              `- [ ] **${a.owner}** — ${a.task}${a.due ? ` _(due ${a.due})_` : ""}`,
          )
        : ["- (none)"]),
      "",
      "## Summary",
      notes.summary,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }, [notes]);

  return (
    <motion.div
      initial={{ x: 360 }}
      animate={{ x: 0 }}
      exit={{ x: 360 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        width: 360,
        minWidth: 360,
        borderLeft: "1px solid #E8E8F0",
        display: "flex",
        flexDirection: "column",
        background: "var(--content-bg)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #E8E8F0",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Thread
        </span>
        <button
          type="button"
          onClick={captureNotes}
          disabled={notesLoading}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            borderRadius: 7,
            border: "1px solid var(--vyne-purple)",
            background: notes ? "rgba(6, 182, 212,0.08)" : "transparent",
            color: "var(--vyne-purple)",
            fontSize: 11,
            fontWeight: 600,
            cursor: notesLoading ? "default" : "pointer",
            opacity: notesLoading ? 0.6 : 1,
            marginRight: 6,
          }}
          title="Generate structured meeting notes from this thread"
        >
          {notesLoading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Sparkles size={11} />
          )}
          {notesLoading ? "Capturing…" : "Capture notes"}
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            padding: 4,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            display: "flex",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--content-secondary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Parent message */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #F0F0F8",
          flexShrink: 0,
          background: "var(--content-secondary)",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <UserAvatar name={parentMsg.author.name} size={30} />
          <div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "baseline",
                marginBottom: 3,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                {parentMsg.author.name}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {formatRelativeTime(parentMsg.createdAt)}
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-primary)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {parentMsg.content}
            </p>
          </div>
        </div>
        {replies.length > 0 && (
          <p
            style={{
              fontSize: 11,
              color: "var(--vyne-purple)",
              marginTop: 8,
              paddingLeft: 40,
            }}
          >
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </p>
        )}
      </div>

      {/* Meeting notes drawer */}
      {notes && (
        <div
          style={{
            padding: 12,
            margin: "10px 12px 0",
            borderRadius: 10,
            background: "var(--alert-purple-bg)",
            border: "1px solid var(--alert-purple-border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FileText size={13} style={{ color: "var(--vyne-purple)" }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-primary)",
                flex: 1,
              }}
            >
              {notes.title}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-tertiary)",
              }}
            >
              {notesProvider}
            </span>
            <button
              type="button"
              onClick={copyNotes}
              aria-label="Copy as markdown"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 5,
                border: "1px solid var(--vyne-purple)",
                background: copied
                  ? "var(--badge-success-bg)"
                  : "var(--content-bg)",
                color: copied
                  ? "var(--badge-success-text)"
                  : "var(--vyne-purple)",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? "Copied" : "Copy MD"}
            </button>
          </div>

          {notes.attendees.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>
                Attendees:
              </strong>{" "}
              {notes.attendees.join(", ")}
            </div>
          )}

          {notes.decisions.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  marginBottom: 3,
                }}
              >
                Decisions
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  fontSize: 12,
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                }}
              >
                {notes.decisions.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {notes.actionItems.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  marginBottom: 3,
                }}
              >
                Action items
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {notes.actionItems.map((a) => (
                  <li
                    key={`${a.owner}-${a.task}`}
                    style={{
                      fontSize: 12,
                      color: "var(--text-primary)",
                      paddingLeft: 16,
                      position: "relative",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 4,
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        border: "1.5px solid var(--vyne-purple)",
                      }}
                    />
                    <strong>{a.owner}</strong> — {a.task}
                    {a.due && (
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {" "}
                        · due {a.due}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p
            style={{
              margin: 0,
              padding: 8,
              borderRadius: 6,
              background: "var(--content-bg)",
              fontSize: 11,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            {notes.summary}
          </p>
        </div>
      )}

      {/* Replies */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}
      >
        {replies.map((r, i) => (
          <MessageRow
            key={r.id}
            msg={r}
            prevMsg={replies[i - 1]}
            onReaction={() => {}}
            onReply={() => {}}
            isCurrentUser={r.author.id === "me"}
          />
        ))}
        {replies.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No replies yet. Start a thread!
          </p>
        )}
        {typingUsers.length > 0 && (
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>
            {typingUsers[0].name} is typing…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <MessageComposer
        placeholder="Reply in thread…"
        onSend={(text) => sendMessage(text, parentMsg.id)}
        onTyping={sendTyping}
      />
    </motion.div>
  );
}
