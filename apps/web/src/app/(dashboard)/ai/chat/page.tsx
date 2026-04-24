"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Sparkles, Loader2, Brain } from "lucide-react";
import { collectVyneContext, resolveCitationHref } from "@/lib/ai/vyne-context";

// Vyne AI — workspace-grounded chat. Every reply is generated against
// the caller's live stores (projects, tasks, CRM, ops, invoicing, HR)
// via /api/ai/ask. No ChatGPT branding: answers come back attributed
// to Vyne AI with [kind:id] citations that we render as links.

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ kind: string; id: string; label: string }>;
  pending?: boolean;
}

const STARTER_QUESTIONS = [
  "Which of my projects are at risk right now?",
  "Which tasks are overdue and who owns them?",
  "Summarise my open CRM deals by stage and total value.",
  "What inventory items are low on stock?",
  "What should I focus on tomorrow, based on my workspace?",
];

export default function VyneAIChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "greet",
      role: "assistant",
      content:
        "Hi — I'm Vyne AI. I can answer questions about your workspace (projects, tasks, CRM deals, inventory, invoicing, HR) with links to the records I'm citing. Try one of the starter questions below or ask your own.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || pending) return;
      const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: trimmed };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setPending(true);

      const history = messages
        .filter((m) => !m.pending)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const context = collectVyneContext();
        const res = await fetch("/api/ai/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed, context, history }),
        });
        const data = (await res.json()) as {
          answer: string;
          citations?: Array<{ kind: string; id: string; label: string }>;
        };
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.answer ?? "Vyne AI didn't reply — please try again.",
            citations: data.citations,
          },
        ]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "I couldn't reach the Vyne AI service. Check your connection and try again.",
          },
        ]);
      } finally {
        setPending(false);
        inputRef.current?.focus();
      }
    },
    [messages, pending],
  );

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--content-bg-secondary)" }}
    >
      <header
        style={{
          padding: "16px 24px 12px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            boxShadow: "0 8px 22px rgba(6, 182, 212, 0.35)",
          }}
        >
          <Brain size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Vyne AI
          </h1>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12.5,
              color: "var(--text-tertiary)",
            }}
          >
            Grounded in your workspace · answers cite real records
          </p>
        </div>
        <Link
          href="/ai"
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 8,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
          }}
        >
          Insights →
        </Link>
      </header>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: "20px 24px" }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {pending && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-tertiary)",
                fontSize: 13,
                padding: "10px 14px",
                alignSelf: "flex-start",
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              Vyne AI is reading your workspace…
            </div>
          )}

          {messages.length === 1 && (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <p
                style={{
                  margin: "8px 0 2px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                Try one of these
              </p>
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void ask(q)}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--content-border)",
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                    fontSize: 13.5,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Sparkles size={12} style={{ color: "var(--vyne-teal)" }} />
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        style={{
          borderTop: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            borderRadius: 14,
            padding: "8px 8px 8px 14px",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="Ask Vyne AI about your projects, tasks, deals, inventory…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 14,
              padding: "8px 0",
              lineHeight: 1.45,
              maxHeight: 160,
              fontFamily: "inherit",
            }}
            aria-label="Ask Vyne AI"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Send message (Enter)"
            title="Send  ·  Enter"
            className="btn-teal"
            style={{
              height: 36,
              padding: "0 14px",
              opacity: pending || !input.trim() ? 0.5 : 1,
              cursor: pending || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p
          style={{
            maxWidth: 820,
            margin: "8px auto 0",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          Vyne AI only reads data in your workspace. Answers cite real records — click a
          citation to jump to the source.
        </p>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: isUser
            ? "var(--content-secondary)"
            : "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
          color: isUser ? "var(--text-secondary)" : "#fff",
          border: isUser ? "1px solid var(--content-border)" : "none",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {isUser ? "You" : <Brain size={14} />}
      </div>
      <div
        style={{
          maxWidth: "78%",
          background: isUser ? "var(--vyne-teal-soft)" : "var(--content-bg)",
          border: `1px solid ${isUser ? "var(--vyne-teal-ring)" : "var(--content-border)"}`,
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "var(--text-primary)",
          whiteSpace: "pre-wrap",
        }}
      >
        {isUser ? (
          message.content
        ) : (
          <AnswerWithCitations text={message.content} />
        )}
      </div>
    </div>
  );
}

function AnswerWithCitations({ text }: { text: string }) {
  // Split on citation markers and render each as a link. Unknown kinds are
  // rendered as a neutral pill so the answer still reads naturally.
  const re = /\[(project|task|deal|contact|product|invoice|employee):([^\]]+)\]/g;
  const parts: Array<{ type: "text"; value: string } | { type: "cite"; kind: string; id: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "cite", kind: m[1], id: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.value}</span>;
        const href = resolveCitationHref(p.kind, p.id);
        const chip = (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "1px 7px",
              marginInline: 2,
              borderRadius: 999,
              background: "var(--vyne-teal-soft)",
              color: "var(--vyne-teal)",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              cursor: href ? "pointer" : "default",
            }}
          >
            {p.kind}:{p.id}
          </span>
        );
        return href ? (
          <Link key={i} href={href} style={{ textDecoration: "none" }}>
            {chip}
          </Link>
        ) : (
          <span key={i}>{chip}</span>
        );
      })}
    </>
  );
}
