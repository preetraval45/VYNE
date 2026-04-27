"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MessageSquare, Hash, Pin, Sparkles } from "lucide-react";
import { useSentMessagesStore } from "@/lib/stores/sentMessages";
import { usePinnedMessagesStore } from "@/lib/stores/pinnedMessages";
import { useSavedStore } from "@/lib/stores/saved";
import type { MsgMessage } from "@/lib/api/client";

export interface SearchHit {
  channelId: string;
  channelName?: string;
  message: MsgMessage;
  score: number;
  source: "sent" | "pinned" | "saved";
}

interface ChatSearchProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Optional channel id to scope search to one channel */
  readonly scopedChannelId?: string;
  /** Channel/DM lookup so we can show the channel name in results */
  readonly channelNameById?: Record<string, string>;
  readonly onSelectHit?: (hit: SearchHit) => void;
}

function fuzzyScore(text: string, query: string): number {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;
  // Exact substring = high score
  const idx = t.indexOf(q);
  if (idx >= 0) return 100 - idx; // earlier match scores higher
  // All chars of query in order = lower score
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 30 - (t.length - q.length) / 100 : 0;
}

export function ChatSearch({
  open,
  onClose,
  scopedChannelId,
  channelNameById,
  onSelectHit,
}: ChatSearchProps) {
  const sent = useSentMessagesStore((s) => s.byChannel);
  const pinned = usePinnedMessagesStore((s) => s.byChannel);
  const saved = useSavedStore((s) => s.saved);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [aiMode, setAiMode] = useState(false);
  const [aiHits, setAiHits] = useState<SearchHit[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // All searchable messages flattened — used both by fuzzy + AI mode
  const allCandidates = useMemo<SearchHit[]>(() => {
    const out: SearchHit[] = [];
    for (const [cid, list] of Object.entries(sent)) {
      if (scopedChannelId && cid !== scopedChannelId) continue;
      for (const m of list) {
        out.push({
          channelId: cid,
          channelName: channelNameById?.[cid] ?? cid,
          message: m,
          score: 0,
          source: "sent",
        });
      }
    }
    for (const [cid, list] of Object.entries(pinned)) {
      if (scopedChannelId && cid !== scopedChannelId) continue;
      for (const p of list) {
        out.push({
          channelId: cid,
          channelName: channelNameById?.[cid] ?? cid,
          message: p.message,
          score: 0,
          source: "pinned",
        });
      }
    }
    for (const s of saved) {
      if (scopedChannelId && s.channelId !== scopedChannelId) continue;
      out.push({
        channelId: s.channelId,
        channelName: s.channelName,
        message: {
          id: s.messageId,
          author: { id: "—", name: s.authorName },
          content: s.content,
          createdAt: s.savedAt,
        },
        score: 0,
        source: "saved",
      });
    }
    return out;
  }, [sent, pinned, saved, scopedChannelId, channelNameById]);

  const fuzzyHits = useMemo<SearchHit[]>(() => {
    if (!query.trim() || aiMode) return [];
    const scored = allCandidates
      .map((h) => ({ ...h, score: fuzzyScore(h.message.content || "", query) }))
      .filter((h) => h.score > 0);
    const byId = new Map<string, SearchHit>();
    for (const h of scored) {
      const cur = byId.get(h.message.id);
      if (!cur || h.score > cur.score) byId.set(h.message.id, h);
    }
    return Array.from(byId.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [query, allCandidates, aiMode]);

  const hits: SearchHit[] = aiMode && aiHits ? aiHits : fuzzyHits;

  // When AI mode is on, debounce the query and call /api/ai/search-messages
  useEffect(() => {
    if (!aiMode) {
      setAiHits(null);
      setAiLoading(false);
      return;
    }
    const q = query.trim();
    if (!q) {
      setAiHits([]);
      return;
    }
    setAiLoading(true);
    const handle = setTimeout(async () => {
      try {
        const idToHit = new Map(allCandidates.map((h) => [h.message.id, h]));
        const candidates = allCandidates.slice(-200).map((h) => ({
          id: h.message.id,
          channelId: h.channelId,
          channelName: h.channelName,
          author: h.message.author.name,
          content: h.message.content,
          timestamp: h.message.createdAt,
        }));
        const res = await fetch("/api/ai/search-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, messages: candidates }),
        });
        if (!res.ok) {
          setAiHits([]);
          return;
        }
        const data = (await res.json()) as {
          hits: Array<{ id: string; reason: string; relevance: number }>;
        };
        const results = data.hits
          .map((h) => {
            const base = idToHit.get(h.id);
            if (!base) return null;
            return { ...base, score: h.relevance };
          })
          .filter(Boolean) as SearchHit[];
        setAiHits(results);
      } catch {
        setAiHits([]);
      } finally {
        setAiLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query, aiMode, allCandidates]);

  function handleSelect(hit: SearchHit) {
    onSelectHit?.(hit);
    onClose();
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,8,16,0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 9990,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "10vh 20px 0",
        }}
      >
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          style={{
            width: "100%",
            maxWidth: 640,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 18px",
              borderBottom: "1px solid var(--content-border)",
            }}
          >
            <Search size={16} style={{ color: "var(--text-secondary)" }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx((i) =>
                    Math.min(i + 1, Math.max(0, hits.length - 1)),
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter" && hits[activeIdx]) {
                  e.preventDefault();
                  handleSelect(hits[activeIdx]);
                }
              }}
              placeholder={
                aiMode
                  ? scopedChannelId
                    ? "Ask AI to find messages in this channel…"
                    : "Ask AI: 'find the message about Acme renewal'…"
                  : scopedChannelId
                    ? "Search this channel…"
                    : "Search across all channels, DMs, pinned, saved…"
              }
              aria-label="Search messages"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => {
                setAiMode((v) => !v);
                setAiHits(null);
              }}
              title={aiMode ? "Switch to fuzzy search" : "Ask AI to find messages"}
              style={{
                padding: "5px 10px",
                borderRadius: 99,
                border: aiMode
                  ? "1px solid var(--vyne-purple)"
                  : "1px solid var(--content-border)",
                background: aiMode
                  ? "rgba(108, 71, 255, 0.15)"
                  : "transparent",
                color: aiMode ? "var(--vyne-purple)" : "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Sparkles size={11} />
              {aiMode ? "AI on" : "Ask AI"}
            </button>
            <kbd
              style={{
                padding: "2px 7px",
                borderRadius: 5,
                background: "var(--content-secondary)",
                color: "var(--text-tertiary)",
                fontSize: 10,
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              }}
            >
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                border: "1px solid var(--content-border)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={12} />
            </button>
          </div>

          <div
            style={{
              maxHeight: "60vh",
              overflowY: "auto",
              padding: 6,
            }}
          >
            {!query.trim() && (
              <div
                style={{
                  padding: "30px 20px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  lineHeight: 1.5,
                }}
              >
                {aiMode
                  ? "Ask in plain English — VYNE AI finds the most relevant messages."
                  : "Type to search across channels, DMs, pinned, and saved."}
                <div style={{ marginTop: 8, fontSize: 11 }}>
                  ↑↓ navigate · ↵ open · esc close
                </div>
              </div>
            )}
            {query.trim() && aiMode && aiLoading && (
              <div
                style={{
                  padding: "30px 20px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--vyne-purple)",
                  lineHeight: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Sparkles size={18} />
                VYNE AI is thinking…
              </div>
            )}
            {query.trim() && !aiLoading && hits.length === 0 && (
              <div
                style={{
                  padding: "30px 20px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                }}
              >
                No matches for &ldquo;{query}&rdquo;
                {aiMode && (
                  <div style={{ marginTop: 6, fontSize: 11 }}>
                    Try a fuzzy search instead — toggle &quot;Ask AI&quot; off.
                  </div>
                )}
              </div>
            )}
            {hits.map((h, i) => (
              <button
                key={`${h.message.id}-${h.source}`}
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                onClick={() => handleSelect(h)}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    i === activeIdx
                      ? "rgba(108, 71, 255, 0.1)"
                      : "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {h.source === "pinned" ? (
                    <Pin size={10} style={{ color: "#F59E0B" }} />
                  ) : (
                    <Hash size={10} />
                  )}
                  <span>{h.channelName}</span>
                  <span>·</span>
                  <span style={{ fontWeight: 600 }}>{h.message.author.name}</span>
                  <span>·</span>
                  <span>
                    {new Date(h.message.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {h.source !== "sent" && (
                    <span
                      style={{
                        marginLeft: "auto",
                        padding: "1px 6px",
                        borderRadius: 5,
                        background:
                          h.source === "pinned"
                            ? "rgba(245,158,11,0.15)"
                            : "rgba(245,158,11,0.12)",
                        color: "#F59E0B",
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {h.source}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    lineHeight: 1.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {highlightMatch(h.message.content || "", query)}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function highlightMatch(text: string, q: string): React.ReactNode {
  if (!q.trim()) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span
        style={{
          background: "rgba(108, 71, 255, 0.25)",
          color: "var(--vyne-purple)",
          fontWeight: 600,
          padding: "0 2px",
          borderRadius: 3,
        }}
      >
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}
