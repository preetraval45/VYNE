"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Sparkles, Loader2, Bot, User as UserIcon } from "lucide-react";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "Summarise the active deals in my pipeline",
  "Which projects are blocked right now?",
  "Draft a follow-up email for an unanswered customer",
  "What invoices are overdue and total amount?",
];

export default function AgentChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<"claude" | "demo" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest. rAF batches and avoids any layout-trigger
  // race against React commits.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const id = requestAnimationFrame(() => {
      ta.style.height = "0";
      ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
    });
    return () => cancelAnimationFrame(id);
  }, [input]);

  async function send(content: string) {
    const text = content.trim();
    if (!text || streaming) return;

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text };
    const asstId = `a-${Date.now()}`;
    const asstMsg: Msg = { id: asstId, role: "assistant", content: "" };
    const next = [...messages, userMsg, asstMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Don't include the empty assistant placeholder we just added
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const headerProvider = res.headers.get("x-vyne-ai");
      if (headerProvider === "claude" || headerProvider === "demo") {
        setProvider(headerProvider);
      }

      if (!res.ok || !res.body) {
        throw new Error(`AI request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((cur) =>
          cur.map((m) => (m.id === asstId ? { ...m, content: acc } : m)),
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setMessages((cur) =>
        cur.map((m) =>
          m.id === asstId ? { ...m, content: `⚠ ${msg}` } : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--content-bg-secondary)" }}>
      {/* Header */}
      <header
        className="surface-frosted"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "14px 24px",
          borderRadius: 0,
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href="/ai"
          className="ring-focus"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "5px 8px",
            marginLeft: -8,
            borderRadius: 6,
            color: "var(--text-secondary)",
            fontSize: 12.5,
          }}
        >
          <ArrowLeft size={13} />
          AI Dashboard
        </Link>

        <div
          aria-hidden="true"
          style={{ width: 1, height: 18, background: "var(--content-border)" }}
        />

        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--aurora-soft)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--vyne-purple)",
            flexShrink: 0,
          }}
        >
          <Sparkles size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            Vyne AI
          </h1>
          <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 1 }}>
            Conversational agent · streams from Claude
          </p>
        </div>

        {provider && (
          <span
            title={
              provider === "demo"
                ? "Set ANTHROPIC_API_KEY in Vercel to enable real AI"
                : "Connected to Claude"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              background:
                provider === "claude"
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(245,158,11,0.12)",
              color:
                provider === "claude"
                  ? "var(--status-success)"
                  : "var(--status-warning)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: provider === "claude" ? "var(--status-success)" : "var(--status-warning)",
              }}
            />
            {provider === "claude" ? "Live" : "Demo"}
          </span>
        )}
      </header>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="content-scroll flex-1 overflow-auto"
        style={{ padding: "24px 24px 8px" }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
          {messages.length === 0 ? (
            <Welcome onPick={(p) => send(p)} />
          ) : (
            messages.map((m) => (
              <Bubble key={m.id} role={m.role} content={m.content} streaming={streaming && m.role === "assistant" && m.content === ""} />
            ))
          )}
        </div>
      </div>

      {/* Composer */}
      <div
        className="surface-frosted"
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 10,
          padding: "14px 24px",
          borderRadius: 0,
          borderLeft: 0,
          borderRight: 0,
          borderBottom: 0,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          style={{
            maxWidth: 760,
            margin: "0 auto",
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              border: "1px solid var(--content-border)",
              borderRadius: 12,
              background: "var(--content-bg)",
              padding: "10px 12px",
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          >
            <textarea
              ref={taRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask anything about your workspace…"
              aria-label="Message Vyne AI"
              disabled={streaming}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                background: "transparent",
                fontSize: 14,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                lineHeight: 1.5,
                minHeight: 22,
                maxHeight: 180,
                letterSpacing: "-0.005em",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              aria-label="Send message"
              className="btn-primary-plus"
              style={{
                padding: "8px 12px",
                fontSize: 12.5,
                opacity: !input.trim() || streaming ? 0.5 : 1,
              }}
            >
              {streaming ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
            </button>
          </div>
        </form>
        <p
          style={{
            maxWidth: 760,
            margin: "8px auto 0",
            fontSize: 10.5,
            color: "var(--text-tertiary)",
            textAlign: "center",
            letterSpacing: "-0.005em",
          }}
        >
          Vyne AI may make mistakes. Always verify destructive actions.
        </p>
      </div>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
        padding: "60px 12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "var(--aurora-soft)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--vyne-purple)",
        }}
      >
        <Sparkles size={26} />
      </div>
      <div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          What can I help with?
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
          Ask about your projects, deals, contacts, invoices, or anything across VYNE.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          maxWidth: 560,
          width: "100%",
        }}
      >
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="surface-elevated"
            style={{
              padding: "12px 14px",
              fontSize: 13,
              color: "var(--text-primary)",
              textAlign: "left",
              cursor: "pointer",
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              borderRadius: 12,
              letterSpacing: "-0.005em",
              transition: "all 0.15s var(--ease-out-quart)",
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: isUser
            ? "linear-gradient(135deg, #7C5CFF, #6366F1)"
            : "var(--aurora-soft)",
          color: isUser ? "#fff" : "var(--vyne-purple)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {isUser ? <UserIcon size={13} /> : <Bot size={14} />}
      </div>
      <div
        style={{
          maxWidth: "78%",
          padding: "10px 14px",
          borderRadius: 14,
          background: isUser ? "var(--aurora-soft)" : "var(--content-bg)",
          border: isUser
            ? "1px solid rgba(124,92,255,0.25)"
            : "1px solid var(--content-border)",
          color: "var(--text-primary)",
          fontSize: 14,
          lineHeight: 1.55,
          letterSpacing: "-0.005em",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content || (streaming ? <span style={{ color: "var(--text-tertiary)" }}>thinking…</span> : "")}
        {streaming && content && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 8,
              height: 14,
              marginLeft: 3,
              verticalAlign: "text-bottom",
              background: "var(--vyne-purple)",
              animation: "pulse-dot 1s ease-in-out infinite",
              borderRadius: 2,
              opacity: 0.6,
            }}
          />
        )}
      </div>
    </div>
  );
}
