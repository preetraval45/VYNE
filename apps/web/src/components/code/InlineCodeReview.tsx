"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, X, Send, AtSign, Check } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";

export interface DiffLine {
  kind: "ctx" | "add" | "del" | "hunk";
  old?: number;
  new?: number;
  content: string;
}

export interface DiffFile {
  path: string;
  lines: DiffLine[];
}

export interface InlineComment {
  id: string;
  filePath: string;
  lineKey: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
  resolved: boolean;
}

interface Props {
  subjectId: string;
  files: DiffFile[];
  className?: string;
}

function storageKey(subjectId: string) {
  return `vyne-code-review-${subjectId}`;
}

function lineKey(l: DiffLine) {
  return `${l.kind}:${l.old ?? ""}:${l.new ?? ""}`;
}

const MENTION_CANDIDATES = [
  "sarah.kim",
  "tony.marquez",
  "maya.okonkwo",
  "preet",
  "platform-oncall",
];

export function InlineCodeReview({ subjectId, files, className }: Props) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [activeLine, setActiveLine] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(subjectId));
      if (raw) setComments(JSON.parse(raw));
    } catch {}
  }, [subjectId]);

  function persist(next: InlineComment[]) {
    setComments(next);
    try {
      localStorage.setItem(storageKey(subjectId), JSON.stringify(next));
    } catch {}
  }

  function submit(filePath: string, key: string) {
    if (!draft.trim()) return;
    const c: InlineComment = {
      id: `c_${Date.now()}`,
      filePath,
      lineKey: key,
      userId: user?.id ?? "demo",
      userName: user?.name ?? "You",
      body: draft.trim(),
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    persist([...comments, c]);
    setDraft("");
    setActiveLine(null);
  }

  function toggleResolve(id: string) {
    persist(
      comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)),
    );
  }

  function remove(id: string) {
    persist(comments.filter((c) => c.id !== id));
  }

  const byKey = useMemo(() => {
    const m: Record<string, InlineComment[]> = {};
    comments.forEach((c) => {
      const k = `${c.filePath}|${c.lineKey}`;
      (m[k] = m[k] ?? []).push(c);
    });
    return m;
  }, [comments]);

  const mentionMatches = MENTION_CANDIDATES.filter((m) =>
    m.toLowerCase().startsWith(mentionQuery.toLowerCase()),
  ).slice(0, 5);

  function handleDraftChange(v: string) {
    setDraft(v);
    const at = v.lastIndexOf("@");
    if (at >= 0 && (at === 0 || /\s/.test(v[at - 1]))) {
      const q = v.slice(at + 1);
      if (!/\s/.test(q)) {
        setMentionQuery(q);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  }

  function pickMention(name: string) {
    const at = draft.lastIndexOf("@");
    setDraft(draft.slice(0, at) + `@${name} `);
    setShowMentions(false);
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {files.map((file) => (
        <section
          key={file.path}
          style={{
            borderRadius: 10,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            {file.path}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "var(--text-tertiary)",
                fontWeight: 500,
                fontFamily: "inherit",
              }}
            >
              {file.lines.filter((l) => l.kind === "add").length}{" "}
              <span style={{ color: "var(--badge-success-text)" }}>+</span>{" "}
              {file.lines.filter((l) => l.kind === "del").length}{" "}
              <span style={{ color: "var(--badge-danger-text)" }}>−</span>
            </span>
          </header>
          <div
            style={{
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            {file.lines.map((l, i) => {
              const key = lineKey(l);
              const globalKey = `${file.path}|${key}`;
              const isActive = activeLine === globalKey;
              const lineComments = byKey[globalKey] ?? [];
              const bg =
                l.kind === "add"
                  ? "rgba(34,197,94,0.08)"
                  : l.kind === "del"
                    ? "rgba(239,68,68,0.08)"
                    : l.kind === "hunk"
                      ? "var(--content-secondary)"
                      : "transparent";
              const marker =
                l.kind === "add" ? "+" : l.kind === "del" ? "-" : " ";
              const markerColor =
                l.kind === "add"
                  ? "var(--badge-success-text)"
                  : l.kind === "del"
                    ? "var(--badge-danger-text)"
                    : "var(--text-tertiary)";
              return (
                <div key={`${file.path}-${i}`}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 40px 20px 1fr 28px",
                      alignItems: "center",
                      gap: 8,
                      padding: "1px 12px",
                      background: bg,
                      color:
                        l.kind === "hunk"
                          ? "var(--text-tertiary)"
                          : "var(--text-primary)",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-tertiary)",
                        textAlign: "right",
                        fontSize: 11,
                      }}
                    >
                      {l.old ?? ""}
                    </span>
                    <span
                      style={{
                        color: "var(--text-tertiary)",
                        textAlign: "right",
                        fontSize: 11,
                      }}
                    >
                      {l.new ?? ""}
                    </span>
                    <span
                      style={{
                        color: markerColor,
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {marker}
                    </span>
                    <span
                      style={{
                        whiteSpace: "pre",
                        overflow: "auto",
                      }}
                    >
                      {l.content}
                    </span>
                    {l.kind !== "hunk" && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveLine(isActive ? null : globalKey)
                        }
                        aria-label="Add comment on this line"
                        aria-pressed={isActive ? "true" : "false"}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 5,
                          border: "1px solid var(--content-border)",
                          background: isActive
                            ? "var(--vyne-purple)"
                            : "var(--content-bg)",
                          color: isActive ? "#fff" : "var(--text-tertiary)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: lineComments.length || isActive ? 1 : 0.35,
                        }}
                      >
                        <MessageSquare size={11} />
                      </button>
                    )}
                  </div>

                  {lineComments.length > 0 && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderTop: "1px dashed var(--content-border)",
                        background: "var(--content-secondary)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        fontFamily: "inherit",
                      }}
                    >
                      {lineComments.map((c) => (
                        <article
                          key={c.id}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            background: "var(--content-bg)",
                            border: "1px solid var(--content-border)",
                            opacity: c.resolved ? 0.65 : 1,
                          }}
                        >
                          <header
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "var(--text-primary)",
                              }}
                            >
                              {c.userName}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-tertiary)",
                              }}
                            >
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                            {c.resolved && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "1px 7px",
                                  borderRadius: 999,
                                  background: "var(--badge-success-bg)",
                                  color: "var(--badge-success-text)",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.07em",
                                }}
                              >
                                Resolved
                              </span>
                            )}
                            <div style={{ flex: 1 }} />
                            <button
                              type="button"
                              onClick={() => toggleResolve(c.id)}
                              aria-label={
                                c.resolved ? "Reopen" : "Resolve"
                              }
                              style={miniBtn}
                            >
                              <Check size={11} />
                              {c.resolved ? "Reopen" : "Resolve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(c.id)}
                              aria-label="Delete comment"
                              style={{
                                ...miniBtn,
                                color: "var(--status-danger)",
                              }}
                            >
                              <X size={11} />
                            </button>
                          </header>
                          <div
                            style={{
                              fontSize: 12.5,
                              color: "var(--text-secondary)",
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.55,
                            }}
                          >
                            {c.body.split(/(@\w[\w.-]*)/g).map((part, idx) =>
                              part.startsWith("@") ? (
                                <span
                                  key={`${c.id}-${idx}`}
                                  style={{
                                    color: "var(--vyne-purple)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {part}
                                </span>
                              ) : (
                                <span key={`${c.id}-${idx}`}>{part}</span>
                              ),
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {isActive && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderTop: "1px dashed var(--content-border)",
                        background: "var(--content-secondary)",
                        fontFamily: "inherit",
                        position: "relative",
                      }}
                    >
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={(e) => handleDraftChange(e.target.value)}
                        placeholder="Leave a comment. Use @ to mention a reviewer…"
                        rows={3}
                        aria-label="Comment body"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 7,
                          border: "1px solid var(--input-border)",
                          background: "var(--input-bg)",
                          color: "var(--text-primary)",
                          fontSize: 12.5,
                          fontFamily: "inherit",
                          outline: "none",
                          resize: "vertical",
                        }}
                      />
                      {showMentions && mentionMatches.length > 0 && (
                        <ul
                          style={{
                            listStyle: "none",
                            padding: 4,
                            margin: "4px 0 0",
                            borderRadius: 8,
                            border: "1px solid var(--content-border)",
                            background: "var(--content-bg)",
                            maxWidth: 240,
                            boxShadow: "0 6px 22px rgba(0,0,0,0.18)",
                          }}
                        >
                          {mentionMatches.map((m) => (
                            <li key={m}>
                              <button
                                type="button"
                                onClick={() => pickMention(m)}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: "none",
                                  background: "transparent",
                                  color: "var(--text-primary)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <AtSign
                                  size={11}
                                  style={{ color: "var(--vyne-purple)" }}
                                />
                                {m}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          marginTop: 8,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveLine(null);
                            setDraft("");
                          }}
                          style={miniBtn}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => submit(file.path, key)}
                          disabled={!draft.trim()}
                          style={{
                            ...miniBtn,
                            background: draft.trim()
                              ? "var(--vyne-purple)"
                              : "var(--content-bg)",
                            color: draft.trim() ? "#fff" : "var(--text-tertiary)",
                            borderColor: "var(--vyne-purple)",
                          }}
                        >
                          <Send size={11} /> Comment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};
