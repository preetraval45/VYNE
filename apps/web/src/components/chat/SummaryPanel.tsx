"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, X, Loader2, RefreshCw } from "lucide-react";
import { aiApi } from "@/lib/api/client";
import type { MsgMessage } from "@/lib/api/client";
import { SUMMARY_LINES, SUMMARY_ACTIONS } from "./constants";

interface SummaryPanelProps {
  readonly onClose: () => void;
  readonly messages?: MsgMessage[];
  readonly channelName?: string;
}

type SummaryState = "loading" | "streaming" | "done" | "error";

export function SummaryPanel({
  onClose,
  messages,
  channelName,
}: SummaryPanelProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [actions, setActions] = useState<
    Array<{ text: string; done: boolean }>
  >([]);
  const [state, setState] = useState<SummaryState>("loading");
  const [visible, setVisible] = useState(0);
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchSummary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSummary() {
    setState("loading");
    setLines([]);
    setActions([]);
    setVisible(0);
    setCheckedActions(new Set());

    // Try AI backend first
    if (messages && messages.length > 0) {
      try {
        const msgData = messages.slice(-20).map((m) => ({
          author: m.author.name,
          content: m.content,
        }));

        // Try streaming endpoint first
        const streamRes = await aiApi.chatStream(
          `Summarize this conversation from #${channelName || "channel"}. List 3-5 key points as bullet points, then list action items.`,
          msgData.map((m) => `${m.author}: ${m.content}`).join("\n"),
        );

        if (streamRes.ok && streamRes.body) {
          setState("streaming");
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let fullText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const eventLines = chunk.split("\n");

            for (const line of eventLines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.done) {
                    // Parse the full text into bullets and actions
                    parseSummaryText(fullText);
                    setState("done");
                    return;
                  }
                  if (data.token) {
                    fullText += data.token;
                  }
                } catch {
                  // Non-JSON SSE line
                }
              }
            }
          }

          if (fullText) {
            parseSummaryText(fullText);
            setState("done");
            return;
          }
        }

        // Fallback: try the analyze endpoint
        const res = await aiApi.summarizeMessages(msgData);
        if (res.data.summary) {
          setLines(res.data.summary);
          setActions(res.data.actions || []);
          setState("done");
          return;
        }
      } catch {
        // Fall through to mock
      }
    }

    // Mock fallback with progressive reveal
    setState("streaming");
    setLines(SUMMARY_LINES);
    setActions(SUMMARY_ACTIONS);

    // Progressive reveal
    const timer = setInterval(
      () =>
        setVisible((v) => {
          const next = v + 1;
          if (next >= SUMMARY_LINES.length + SUMMARY_ACTIONS.length) {
            clearInterval(timer);
            setState("done");
          }
          return next;
        }),
      400,
    );

    return () => clearInterval(timer);
  }

  function parseSummaryText(text: string) {
    const bulletLines: string[] = [];
    const actionItems: Array<{ text: string; done: boolean }> = [];
    let inActions = false;

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/action item/i.test(trimmed) || /to.?do/i.test(trimmed)) {
        inActions = true;
        continue;
      }

      const bullet = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "");
      if (!bullet) continue;

      if (inActions) {
        actionItems.push({ text: bullet, done: false });
      } else {
        bulletLines.push(bullet);
      }
    }

    setLines(bulletLines.length > 0 ? bulletLines : SUMMARY_LINES);
    setActions(actionItems.length > 0 ? actionItems : SUMMARY_ACTIONS);
    setVisible(bulletLines.length + actionItems.length + SUMMARY_LINES.length);
  }

  function toggleAction(index: number) {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const displayLines = state === "streaming" || state === "done" ? lines : [];
  const displayActions =
    state === "streaming" || state === "done" ? actions : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{
        position: "absolute",
        bottom: 70,
        left: 16,
        right: 16,
        zIndex: 40,
        background: "var(--content-bg, #fff)",
        border: "1px solid #E0D5FF",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(6, 182, 212,0.15)",
        padding: 16,
        maxHeight: 340,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Sparkles size={15} style={{ color: "#06B6D4" }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary, var(--text-primary))",
            }}
          >
            AI Thread Summary
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#06B6D4",
              background: "rgba(6, 182, 212,0.1)",
              padding: "1px 6px",
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            {state === "loading"
              ? "LOADING"
              : state === "streaming"
                ? "LIVE"
                : "BETA"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {state === "done" && (
            <button
              aria-label="Refresh"
              onClick={fetchSummary}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                display: "flex",
                padding: 4,
                borderRadius: 5,
              }}
              title="Regenerate"
            >
              <RefreshCw size={13} />
            </button>
          )}
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              padding: 4,
              borderRadius: 5,
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {state === "loading" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 0",
          }}
        >
          <Loader2
            size={16}
            style={{ color: "#06B6D4", animation: "spin 1s linear infinite" }}
          />
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary, var(--text-secondary))",
            }}
          >
            Analyzing conversation...
          </span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Summary bullets */}
      {displayLines.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {displayLines.map(
            (line, i) =>
              (state === "done" || visible > i) && (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary, #2D2D4E)",
                    lineHeight: 1.6,
                    margin: "0 0 6px",
                  }}
                >
                  • {line}
                </motion.p>
              ),
          )}
        </div>
      )}

      {/* Action items */}
      {displayActions.length > 0 &&
        (state === "done" || visible > displayLines.length) && (
          <div
            style={{
              borderTop:
                "1px solid var(--content-border, var(--content-bg-secondary))",
              paddingTop: 10,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-secondary, var(--text-secondary))",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 8px",
              }}
            >
              Action Items
            </p>
            {displayActions.map((act, i) => {
              const isDone = act.done || checkedActions.has(i);
              return (
                (state === "done" || visible > displayLines.length + i) && (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 7,
                      marginBottom: 5,
                      cursor: "pointer",
                    }}
                    onClick={() => toggleAction(i)}
                  >
                    <span style={{ fontSize: 12, marginTop: 1 }}>
                      {isDone ? "✅" : "⬜"}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: isDone
                          ? "var(--text-tertiary, var(--text-tertiary))"
                          : "var(--text-primary, var(--text-primary))",
                        textDecoration: isDone ? "line-through" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {act.text}
                    </span>
                  </motion.div>
                )
              );
            })}
          </div>
        )}
    </motion.div>
  );
}
