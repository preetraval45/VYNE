"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Code,
  Terminal,
  Webhook,
  Zap,
  Copy,
  Check,
  Play,
  ChevronRight,
} from "lucide-react";

interface OperationDef {
  method: string;
  path: string;
  summary: string;
  operationId: string;
  tag: string;
}

interface OpenApiSpec {
  info: { title: string; version: string; description: string };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<
    string,
    Record<
      string,
      {
        summary: string;
        operationId: string;
        tags?: string[];
      }
    >
  >;
}

const RATE_LIMIT_TIERS = [
  {
    name: "Free",
    rps: "1 req/s",
    daily: "1,000 / day",
    burst: "10",
    color: "var(--text-secondary)",
  },
  {
    name: "Starter",
    rps: "5 req/s",
    daily: "10,000 / day",
    burst: "50",
    color: "var(--vyne-purple)",
  },
  {
    name: "Business",
    rps: "25 req/s",
    daily: "100,000 / day",
    burst: "200",
    color: "var(--vyne-purple-light)",
  },
  {
    name: "Enterprise",
    rps: "Unmetered*",
    daily: "Custom",
    burst: "Custom",
    color: "#22C55E",
  },
];

const SAMPLE_BODIES: Record<string, string> = {
  "POST /issues": JSON.stringify(
    { title: "Fix S3 upload retries", priority: "high" },
    null,
    2,
  ),
  "POST /webhooks": JSON.stringify(
    {
      url: "https://example.com/hook",
      events: ["order.created", "incident.detected"],
    },
    null,
    2,
  ),
  "POST /ai/query": JSON.stringify(
    { question: "Which orders are stuck?" },
    null,
    2,
  ),
};

function Highlighted({ children }: { children: string }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 14,
        borderRadius: 10,
        background: "#0F0F20",
        border: "1px solid rgba(255,255,255,0.06)",
        color: "var(--content-border)",
        fontSize: 12,
        lineHeight: 1.55,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        overflowX: "auto",
        whiteSpace: "pre",
      }}
    >
      {children}
    </pre>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
      aria-label="Copy"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 5,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: copied ? "#4ADE80" : "var(--text-tertiary)",
        fontSize: 10,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function DevelopersPage() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("vyne_live_demo_key_xxxx");
  const [bodyText, setBodyText] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/openapi")
      .then((r) => r.json())
      .then((data: OpenApiSpec) => {
        setSpec(data);
        // pick the first operation
        const firstPath = Object.keys(data.paths)[0];
        if (firstPath) {
          const firstMethod = Object.keys(data.paths[firstPath])[0];
          setSelectedOpId(`${firstMethod.toUpperCase()} ${firstPath}`);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const operations = useMemo<OperationDef[]>(() => {
    if (!spec) return [];
    const out: OperationDef[] = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, def] of Object.entries(methods)) {
        out.push({
          method: method.toUpperCase(),
          path,
          summary: def.summary,
          operationId: def.operationId,
          tag: def.tags?.[0] ?? "API",
        });
      }
    }
    return out;
  }, [spec]);

  const grouped = useMemo(() => {
    const map = new Map<string, OperationDef[]>();
    for (const op of operations) {
      const list = map.get(op.tag) ?? [];
      list.push(op);
      map.set(op.tag, list);
    }
    return map;
  }, [operations]);

  const selectedOp = operations.find(
    (o) => `${o.method} ${o.path}` === selectedOpId,
  );

  useEffect(() => {
    if (!selectedOp) return;
    const key = `${selectedOp.method} ${selectedOp.path}`;
    setBodyText(SAMPLE_BODIES[key] ?? "");
    setResponse(null);
  }, [selectedOpId, selectedOp]);

  function runRequest() {
    if (!selectedOp) return;
    setRunning(true);
    // Demo-mode: build a plausible mock response based on the operation.
    setTimeout(() => {
      const mock = mockResponse(selectedOp);
      setResponse(JSON.stringify(mock, null, 2));
      setRunning(false);
    }, 600);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0A0A1A 0%, #0F0F20 100%)",
        color: "var(--content-border)",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(10,10,26,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, #06B6D4, #22D3EE)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              V
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              VYNE Developers
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "60px 24px 36px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(6, 182, 212,0.1)",
              border: "1px solid rgba(6, 182, 212,0.25)",
              color: "#67E8F9",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            <Code size={12} />
            Public API · v{spec?.info.version ?? "0.9.0"}
          </div>
          <h1
            style={{
              fontSize: "clamp(34px, 5vw, 56px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#fff",
              margin: "0 0 14px",
            }}
          >
            Build on top of VYNE
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.7)",
              maxWidth: 720,
            }}
          >
            One REST API across every module — chat, projects, ERP, finance, AI.
            OpenAPI spec, typed SDK, CLI, and a VS Code extension. Try any
            endpoint live below.
          </p>

          {/* Top-level cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              marginTop: 32,
            }}
          >
            <a
              href="#playground"
              style={{
                padding: 18,
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <Play size={18} style={{ color: "#22D3EE", marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                API playground
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                Try every endpoint live in the browser.
              </div>
            </a>
            <a
              href="#cli"
              style={{
                padding: 18,
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <Terminal
                size={18}
                style={{ color: "#22C55E", marginBottom: 8 }}
              />
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                CLI
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                <code>npm i -g vyne</code> — script everything.
              </div>
            </a>
            <a
              href="#vscode"
              style={{
                padding: 18,
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <Code size={18} style={{ color: "#3B82F6", marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                VS Code extension
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                Issues + docs without leaving your editor.
              </div>
            </a>
            <a
              href="#webhooks"
              style={{
                padding: 18,
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <Webhook
                size={18}
                style={{ color: "#F59E0B", marginBottom: 8 }}
              />
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                Webhooks
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                React to every event with HMAC-signed callbacks.
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Playground */}
      <section
        id="playground"
        style={{ padding: "20px 24px 60px", scrollMarginTop: 80 }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.01em",
              margin: "0 0 14px",
            }}
          >
            API playground
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "260px 1fr",
              gap: 16,
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
              minHeight: 460,
            }}
          >
            {/* Endpoint sidebar */}
            <aside
              style={{
                background: "rgba(0,0,0,0.25)",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                overflowY: "auto",
                maxHeight: 600,
              }}
            >
              {Array.from(grouped.entries()).map(([tag, ops]) => (
                <div key={tag}>
                  <div
                    style={{
                      padding: "10px 14px 4px",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    {tag}
                  </div>
                  {ops.map((op) => {
                    const id = `${op.method} ${op.path}`;
                    const active = id === selectedOpId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedOpId(id)}
                        style={{
                          display: "flex",
                          width: "100%",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 14px",
                          textAlign: "left",
                          background: active
                            ? "rgba(6, 182, 212,0.15)"
                            : "transparent",
                          border: "none",
                          borderLeft: active
                            ? "3px solid #06B6D4"
                            : "3px solid transparent",
                          color: active ? "#fff" : "rgba(255,255,255,0.65)",
                          cursor: "pointer",
                          fontFamily:
                            "var(--font-geist-mono), ui-monospace, monospace",
                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 700,
                            color:
                              op.method === "GET"
                                ? "#4ADE80"
                                : op.method === "POST"
                                  ? "#22D3EE"
                                  : op.method === "PATCH"
                                    ? "#FCD34D"
                                    : "#F87171",
                            background:
                              op.method === "GET"
                                ? "rgba(34,197,94,0.15)"
                                : op.method === "POST"
                                  ? "rgba(6, 182, 212,0.18)"
                                  : op.method === "PATCH"
                                    ? "rgba(245,158,11,0.18)"
                                    : "rgba(239,68,68,0.18)",
                          }}
                        >
                          {op.method}
                        </span>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {op.path}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </aside>

            {/* Request + response */}
            <div
              style={{
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {selectedOp ? (
                <>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: 5,
                          background:
                            selectedOp.method === "GET"
                              ? "rgba(34,197,94,0.18)"
                              : "rgba(6, 182, 212,0.2)",
                          color:
                            selectedOp.method === "GET" ? "#4ADE80" : "#67E8F9",
                          fontFamily:
                            "var(--font-geist-mono), ui-monospace, monospace",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {selectedOp.method}
                      </span>
                      <code
                        style={{
                          fontSize: 14,
                          color: "#fff",
                          fontFamily:
                            "var(--font-geist-mono), ui-monospace, monospace",
                        }}
                      >
                        {selectedOp.path}
                      </code>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      {selectedOp.summary}
                    </p>
                  </div>

                  <label
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      Authorization
                    </span>
                    <input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      aria-label="API key"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#fff",
                        fontFamily:
                          "var(--font-geist-mono), ui-monospace, monospace",
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                  </label>

                  {(selectedOp.method === "POST" ||
                    selectedOp.method === "PATCH") && (
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        Request body (JSON)
                      </span>
                      <textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        rows={6}
                        aria-label="Request body"
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.04)",
                          color: "#fff",
                          fontFamily:
                            "var(--font-geist-mono), ui-monospace, monospace",
                          fontSize: 12,
                          outline: "none",
                          resize: "vertical",
                        }}
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={runRequest}
                    disabled={running}
                    style={{
                      alignSelf: "flex-start",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "9px 18px",
                      borderRadius: 9,
                      border: "none",
                      background: "linear-gradient(135deg, #06B6D4, #22D3EE)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: running ? "default" : "pointer",
                      boxShadow: "0 4px 14px rgba(6, 182, 212,0.3)",
                      opacity: running ? 0.7 : 1,
                    }}
                  >
                    <Play size={12} />
                    {running ? "Running…" : "Send request"}
                  </button>

                  {response && (
                    <div style={{ position: "relative" }}>
                      <CopyButton text={response} />
                      <Highlighted>{response}</Highlighted>
                    </div>
                  )}

                  <div style={{ position: "relative" }}>
                    <CopyButton
                      text={curlSnippet(selectedOp, apiKey, bodyText)}
                    />
                    <Highlighted>
                      {curlSnippet(selectedOp, apiKey, bodyText)}
                    </Highlighted>
                  </div>
                </>
              ) : (
                <p style={{ color: "rgba(255,255,255,0.5)" }}>
                  Pick an endpoint to try it.
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            🔒 Demo mode — Send executes against a local mock; in production,
            requests hit <code>{spec?.servers[0].url}</code>.
            <a
              href="/api/openapi"
              style={{
                marginLeft: 12,
                color: "#67E8F9",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Download OpenAPI 3.1 spec →
            </a>
          </div>
        </div>
      </section>

      {/* CLI */}
      <section id="cli" style={{ padding: "60px 24px", scrollMarginTop: 80 }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          <div>
            <Terminal
              size={24}
              style={{ color: "#22C55E", marginBottom: 12 }}
            />
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#fff",
                margin: "0 0 10px",
                letterSpacing: "-0.01em",
              }}
            >
              The VYNE CLI
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
              Script every part of your workspace from the terminal. Open issues
              from a commit hook, ship a release note, kick off an AI agent —
              all without leaving the shell.
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "16px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
              }}
            >
              {[
                'vyne issue create --title "Fix billing UI" --priority high',
                "vyne docs sync ./README.md → /docs/onboarding",
                'vyne ai query "Which orders are stuck?"',
                "vyne webhook test order.created",
              ].map((cmd) => (
                <li
                  key={cmd}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <ChevronRight size={12} style={{ color: "#22C55E" }} />
                  <code style={{ fontSize: 12 }}>{cmd}</code>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ position: "relative" }}>
            <CopyButton text="npm install -g vyne" />
            <Highlighted>{`# Install
npm install -g vyne

# Authenticate (opens browser)
vyne login

# Or with an API key
vyne login --token vyne_live_xxxx

# Try it
vyne whoami
vyne issue list --status in_progress
vyne ai query "What changed in the last 24h?"`}</Highlighted>
          </div>
        </div>
      </section>

      {/* VS Code extension */}
      <section
        id="vscode"
        style={{ padding: "60px 24px", scrollMarginTop: 80 }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          <div style={{ position: "relative" }}>
            <CopyButton text="ext install vyne.vyne-vscode" />
            <Highlighted>{`# Install from VS Code
ext install vyne.vyne-vscode

# Or browse
https://marketplace.visualstudio.com/items?itemName=vyne.vyne-vscode

# Sign in via the command palette
> VYNE: Sign in
> VYNE: Open issue from line
> VYNE: Insert doc snippet
> VYNE: Ask AI about this file`}</Highlighted>
          </div>
          <div>
            <Code size={24} style={{ color: "#3B82F6", marginBottom: 12 }} />
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#fff",
                margin: "0 0 10px",
                letterSpacing: "-0.01em",
              }}
            >
              VS Code extension
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
              Issues, docs, and AI without context-switching. The extension
              activates on any repo with a <code>.vyne</code> directory and
              auto-links commits to issue IDs.
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "16px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
              }}
            >
              {[
                "Inline issue badges (gutter + hover card)",
                "Doc panel — search + insert snippets",
                "AI chat scoped to the active file or selection",
                "Commit message helper from current changes",
              ].map((feat) => (
                <li
                  key={feat}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <ChevronRight size={12} style={{ color: "#3B82F6" }} />
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Rate limits */}
      <section
        id="rate-limits"
        style={{ padding: "60px 24px", scrollMarginTop: 80 }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Zap size={24} style={{ color: "#F59E0B", marginBottom: 12 }} />
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 8px",
              letterSpacing: "-0.01em",
            }}
          >
            Rate limits per API key
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
              maxWidth: 720,
              margin: "0 0 22px",
            }}
          >
            Each key carries its own tier. Headers on every response —{" "}
            <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>,{" "}
            <code>X-RateLimit-Reset</code> — keep your client honest.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {RATE_LIMIT_TIERS.map((t) => (
              <div
                key={t.name}
                style={{
                  padding: 18,
                  borderRadius: 12,
                  border: `1px solid ${t.color}33`,
                  background: `${t.color}0a`,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: t.color,
                    marginBottom: 8,
                  }}
                >
                  {t.name}
                </div>
                <dl
                  style={{
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <dt style={{ color: "rgba(255,255,255,0.5)" }}>
                      Sustained
                    </dt>
                    <dd style={{ margin: 0 }}>{t.rps}</dd>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <dt style={{ color: "rgba(255,255,255,0.5)" }}>
                      Daily cap
                    </dt>
                    <dd style={{ margin: 0 }}>{t.daily}</dd>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <dt style={{ color: "rgba(255,255,255,0.5)" }}>Burst</dt>
                    <dd style={{ margin: 0 }}>{t.burst}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              marginTop: 8,
            }}
          >
            * Enterprise: subject to fair-use ceilings. Talk to us.
          </p>
        </div>
      </section>

      <footer
        style={{
          padding: "30px 24px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.5)",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        VYNE Developers · Spec served from{" "}
        <Link
          href="/api/openapi"
          style={{ color: "#67E8F9", textDecoration: "underline" }}
        >
          /api/openapi
        </Link>
      </footer>
    </div>
  );
}

function curlSnippet(op: OperationDef, apiKey: string, body: string): string {
  const lines = [
    `curl -X ${op.method} \\`,
    `  https://api.vyne.dev/v1${op.path} \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json"`,
  ];
  if ((op.method === "POST" || op.method === "PATCH") && body.trim()) {
    lines[lines.length - 1] += " \\";
    lines.push(`  -d '${body.replace(/\n/g, "")}'`);
  }
  return lines.join("\n");
}

function mockResponse(op: OperationDef): unknown {
  const path = op.path;
  const method = op.method;
  if (path.endsWith("/issues") && method === "GET") {
    return {
      data: [
        {
          id: "iss_8k4j2n",
          title: "Fix Secrets Manager IAM permission",
          status: "in_progress",
          priority: "urgent",
          assigneeId: "usr_abc",
        },
        {
          id: "iss_4m9p1q",
          title: "Add Stripe usage metering",
          status: "todo",
          priority: "high",
          assigneeId: null,
        },
      ],
      nextCursor: null,
    };
  }
  if (path.endsWith("/issues") && method === "POST") {
    return {
      id: `iss_${Math.random().toString(36).slice(2, 8)}`,
      title: "Fix S3 upload retries",
      status: "todo",
      priority: "high",
      createdAt: new Date().toISOString(),
    };
  }
  if (path.endsWith("/orders")) {
    return {
      data: [
        {
          id: "ord_a8k3pq",
          number: "ORD-1042",
          status: "confirmed",
          total: 8400,
          currency: "USD",
        },
      ],
    };
  }
  if (path.endsWith("/approve")) {
    return {
      id: "ord_a8k3pq",
      status: "confirmed",
      approvedAt: new Date().toISOString(),
    };
  }
  if (path.includes("/webhooks") && method === "GET") {
    return [
      {
        id: "wh_001",
        url: "https://hooks.example.com/orders",
        events: ["order.created", "order.shipped"],
        active: true,
      },
    ];
  }
  if (path.includes("/webhooks") && method === "POST") {
    return {
      id: `wh_${Math.random().toString(36).slice(2, 8)}`,
      url: "https://example.com/hook",
      events: ["order.created"],
      active: true,
    };
  }
  if (path.endsWith("/ai/query")) {
    return {
      answer:
        "There are 47 orders stuck in 'processing' due to the api-service v2.4.1 deploy failure. Estimated revenue at risk: $12,400.",
      reasoningSteps: [
        "Pulled deployment events from observability for the last 24h",
        "Joined with orders.status='processing' since 2:14 PM",
        "Computed sum(orders.total) for the affected window",
      ],
    };
  }
  return { ok: true };
}
