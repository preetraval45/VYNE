"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Send,
  X,
  ChevronRight,
  PanelRight,
  Loader2,
} from "lucide-react";
import { useAiSuggestedPrompts } from "@/hooks/useAiSuggestedPrompts";
import { AiConfidenceBadge } from "./AiConfidenceBadge";

/**
 * AiSidebar — context-aware mini-chat that mounts in the right rail
 * on every page. Knows the current pathname (so it primes prompts
 * with the right module's vocabulary) and the active record (when
 * the host page passes `entityKey`).
 *
 *   <AiSidebar entityKey="deal:DEAL-123" />
 *
 * Architecture:
 *   - Drawer toggled by a fixed pill button (right edge).
 *   - Streams from `/api/ai/search` (existing) — same payload Cmd+K
 *     uses for the `?` prefix mode.
 *   - First panel: 4 suggested prompts derived from the active route.
 *   - Once the user submits, transitions into a single-question
 *     chat with confidence badge + "Open in full chat" link.
 */

export interface AiSidebarProps {
  /** Optional entity context — `deal:DEAL-123`, `task:T-9`, … */
  entityKey?: string;
  /** Default-open state. Default: false. */
  defaultOpen?: boolean;
  /** Hide the floating launcher (e.g. when host page already manages
   *  the open state). Default: false. */
  hideLauncher?: boolean;
}

interface AiHit {
  id: string;
  title: string;
  snippet?: string;
  href?: string;
}

export function AiSidebar({
  entityKey,
  defaultOpen = false,
  hideLauncher = false,
}: AiSidebarProps) {
  const pathname = usePathname();
  const suggestions = useAiSuggestedPrompts();

  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [hits, setHits] = useState<AiHit[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cmd+/ toggles the sidebar — mirror of the global search Ctrl+/.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "/") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // Reset the chat when the route changes; preserve the open state.
    setSubmitted(null);
    setAnswer("");
    setHits([]);
    setConfidence(null);
  }, [pathname]);

  async function ask(prompt: string) {
    const q = prompt.trim();
    if (!q) return;
    setSubmitted(q);
    setLoading(true);
    setAnswer("");
    setHits([]);
    setConfidence(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          context: { pathname, entityKey },
        }),
      });
      const data = (await res.json()) as {
        answer?: string;
        hits?: AiHit[];
      };
      setAnswer(data.answer ?? "");
      setHits(data.hits ?? []);
      // Heuristic confidence: 1.0 if ≥ 2 hits + answer non-empty,
      // 0.55 if answer-only, 0.25 if neither.
      const ans = data.answer ?? "";
      const hitCount = data.hits?.length ?? 0;
      const c =
        hitCount >= 2 && ans.length > 40
          ? 0.85
          : hitCount >= 1 && ans.length > 0
            ? 0.6
            : ans.length > 0
              ? 0.45
              : 0.2;
      setConfidence(c);
    } catch {
      setAnswer("Couldn't reach the AI service.");
      setConfidence(0.1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!hideLauncher && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close AI sidebar" : "Open AI sidebar"}
          aria-expanded={open ? "true" : "false"}
          title="AI sidebar (⌘+⇧+/ )"
          style={{
            position: "fixed",
            right: open ? 326 : 14,
            bottom: 84,
            zIndex: 60,
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            background: open
              ? "var(--vyne-accent, var(--vyne-purple))"
              : "var(--content-bg)",
            color: open ? "#fff" : "var(--vyne-accent, var(--vyne-purple))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
            cursor: "pointer",
            transition: "right 200ms ease, background 200ms",
          }}
        >
          {open ? <ChevronRight size={14} /> : <Sparkles size={14} />}
        </button>
      )}

      {open && (
        <aside
          role="complementary"
          aria-label="AI sidebar"
          style={{
            position: "fixed",
            top: 56,
            bottom: 0,
            right: 0,
            width: 320,
            maxWidth: "100vw",
            zIndex: 55,
            background: "var(--content-bg)",
            borderLeft: "1px solid var(--content-border)",
            boxShadow: "-12px 0 32px rgba(0,0,0,0.10)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderBottom: "1px solid var(--content-border)",
            }}
          >
            <Sparkles
              size={14}
              style={{ color: "var(--vyne-accent, var(--vyne-purple))" }}
            />
            <strong
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                flex: 1,
              }}
            >
              Vyne AI
            </strong>
            {entityKey && (
              <span
                title={entityKey}
                style={{
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: "var(--content-secondary)",
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-tertiary)",
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entityKey}
              </span>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              style={iconBtnStyle}
            >
              <X size={12} />
            </button>
          </header>

          {/* Body */}
          <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
            {!submitted ? (
              <>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                  }}
                >
                  Ask anything about <strong>{moduleNameFor(pathname)}</strong>.
                  Or pick a prompt:
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {suggestions.slice(0, 5).map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => ask(s.prompt)}
                        style={promptRowStyle}
                        onMouseEnter={(e) =>
                          ((
                            e.currentTarget as HTMLElement
                          ).style.borderColor = "var(--vyne-accent, var(--vyne-purple))")
                        }
                        onMouseLeave={(e) =>
                          ((
                            e.currentTarget as HTMLElement
                          ).style.borderColor = "var(--content-border)")
                        }
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--content-secondary)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    marginBottom: 10,
                    fontWeight: 500,
                  }}
                >
                  {submitted}
                </div>
                {loading ? (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <Loader2
                      size={12}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Thinking…
                  </div>
                ) : (
                  <>
                    {answer && (
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--text-primary)",
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                          marginBottom: 10,
                        }}
                      >
                        {answer}
                      </div>
                    )}
                    {confidence !== null && (
                      <div style={{ marginBottom: 10 }}>
                        <AiConfidenceBadge score={confidence} />
                      </div>
                    )}
                    {hits.length > 0 && (
                      <div>
                        <header
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            color: "var(--text-tertiary)",
                            marginBottom: 6,
                          }}
                        >
                          Sources
                        </header>
                        <ul
                          style={{
                            listStyle: "none",
                            padding: 0,
                            margin: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          {hits.slice(0, 5).map((h) => (
                            <li key={h.id}>
                              <a
                                href={h.href ?? "#"}
                                style={hitRowStyle}
                                onClick={(e) => !h.href && e.preventDefault()}
                              >
                                <strong
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-primary)",
                                    fontWeight: 600,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {h.title}
                                </strong>
                                {h.snippet && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: "var(--text-tertiary)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {h.snippet}
                                  </span>
                                )}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <a
                      href={`/ai/chat?prompt=${encodeURIComponent(submitted)}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--vyne-accent, var(--vyne-purple))",
                        textDecoration: "none",
                      }}
                    >
                      Open in full chat
                      <ChevronRight size={11} />
                    </a>
                  </>
                )}
              </>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
              setDraft("");
            }}
            style={{
              padding: 10,
              borderTop: "1px solid var(--content-border)",
              display: "flex",
              gap: 6,
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(draft);
                  setDraft("");
                }
              }}
              placeholder={`Ask Vyne AI…`}
              aria-label="Ask Vyne AI"
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 12.5,
                outline: "none",
                fontFamily: "inherit",
                maxHeight: 100,
              }}
            />
            <button
              type="submit"
              disabled={!draft.trim() || loading}
              aria-label="Send"
              style={{
                padding: "0 12px",
                borderRadius: 8,
                border: "none",
                background: draft.trim()
                  ? "var(--vyne-accent, var(--vyne-purple))"
                  : "var(--content-border)",
                color: "#fff",
                cursor: draft.trim() ? "pointer" : "default",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={12} />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}

function moduleNameFor(pathname: string | null): string {
  const seg = (pathname ?? "/").split("/")[1] ?? "";
  if (!seg) return "this workspace";
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

const iconBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  borderRadius: 6,
  cursor: "pointer",
};

const promptRowStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-primary)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  lineHeight: 1.4,
};

const hitRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "6px 8px",
  borderRadius: 6,
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  textDecoration: "none",
};
