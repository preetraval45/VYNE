"use client";

import { use, useEffect } from "react";

interface PageProps {
  readonly params: Promise<{ widget: string }>;
}

export default function EmbedWidgetPage({ params }: PageProps) {
  const { widget } = use(params);

  // Notify parent of our content height so the iframe can auto-resize
  useEffect(() => {
    function postHeight() {
      const h = document.documentElement.scrollHeight;
      window.parent?.postMessage({ type: "vyne:resize", height: h }, "*");
    }
    postHeight();
    const ro = new ResizeObserver(postHeight);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        background: "#fff",
        color: "#1A1A2E",
        padding: 20,
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "linear-gradient(135deg,#06B6D4,#22D3EE)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          V
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1A2E" }}>
          VYNE
        </span>
        <span style={{ fontSize: 11, color: "#A0A0B8" }}>
          Embedded · {widget}
        </span>
      </header>
      <WidgetContent widget={widget} />
      <footer
        style={{
          marginTop: 18,
          paddingTop: 12,
          borderTop: "1px solid #E8E8F0",
          fontSize: 10,
          color: "#A0A0B8",
          textAlign: "center",
        }}
      >
        Powered by{" "}
        <a
          href="https://vyne.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#06B6D4", fontWeight: 600 }}
        >
          VYNE
        </a>
      </footer>
    </div>
  );
}

function WidgetContent({ widget }: { widget: string }) {
  switch (widget) {
    case "kanban":
      return <KanbanWidget />;
    case "incidents":
      return <IncidentsWidget />;
    case "ai-chat":
      return <AiChatWidget />;
    case "docs-search":
      return <DocsSearchWidget />;
    case "status-badge":
      return <StatusBadgeWidget />;
    default:
      return <StatsWidget />;
  }
}

function StatsWidget() {
  const stats = [
    { label: "MRR", value: "$48.2k", delta: "+12% WoW", color: "#22C55E" },
    { label: "Active users", value: "284", delta: "+9%", color: "#22C55E" },
    { label: "Open orders", value: "156", delta: "4 urgent", color: "#F59E0B" },
    { label: "Health", value: "4 / 5", delta: "1 degraded", color: "#EF4444" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            padding: 14,
            borderRadius: 10,
            border: "1px solid #E8E8F0",
            background: "#FAFAFE",
          }}
        >
          <div style={{ fontSize: 11, color: "#6B6B8A" }}>{s.label}</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1A1A2E",
              letterSpacing: "-0.02em",
              marginTop: 2,
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>
            {s.delta}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanWidget() {
  const cols = [
    { name: "To do", items: ["Fix billing UI", "Add Stripe metering"] },
    { name: "In progress", items: ["IAM perm fix"] },
    { name: "Done", items: ["Onboarding redesign", "AI search"] },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
      }}
    >
      {cols.map((c) => (
        <div
          key={c.name}
          style={{
            padding: 8,
            borderRadius: 9,
            background: "#F4F4F8",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#6B6B8A",
              marginBottom: 6,
            }}
          >
            {c.name}
          </div>
          {c.items.map((t) => (
            <div
              key={t}
              style={{
                padding: 8,
                marginBottom: 6,
                borderRadius: 7,
                background: "#fff",
                border: "1px solid #E8E8F0",
                fontSize: 11,
                color: "#1A1A2E",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function IncidentsWidget() {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: "1px solid #FCA5A5",
        background: "#FEF2F2",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#991B1B",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        🔴 Active incident
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E" }}>
        api-service v2.4.1 deploy failed
      </div>
      <div style={{ fontSize: 11, color: "#6B6B8A", marginTop: 2 }}>
        47 orders stuck · $12.4k at risk · started 7m ago
      </div>
    </div>
  );
}

function AiChatWidget() {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: "#F4F1FF",
        border: "1px solid #C7B8FF",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#06B6D4",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 8,
        }}
      >
        ✨ Ask Vyne AI
      </div>
      <input
        readOnly
        placeholder="Which orders are stuck?"
        aria-label="Ask AI"
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 6,
          border: "1px solid #D8D8E8",
          background: "#fff",
          fontSize: 12,
          color: "#1A1A2E",
        }}
      />
    </div>
  );
}

function DocsSearchWidget() {
  return (
    <div>
      <input
        readOnly
        placeholder="Search docs…"
        aria-label="Search docs"
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 6,
          border: "1px solid #D8D8E8",
          background: "#fff",
          fontSize: 12,
          color: "#1A1A2E",
          marginBottom: 10,
        }}
      />
      <div
        style={{
          fontSize: 11,
          color: "#6B6B8A",
          padding: 8,
          background: "#FAFAFE",
          borderRadius: 6,
        }}
      >
        Onboarding playbook · Postmortem April 10 · API key rotation
      </div>
    </div>
  );
}

function StatusBadgeWidget() {
  return (
    <a
      href="https://vyne.vercel.app/status"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        background: "#DCFCE7",
        border: "1px solid #4ADE80",
        color: "#166534",
        fontSize: 12,
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#22C55E",
          boxShadow: "0 0 0 3px rgba(34,197,94,0.2)",
        }}
      />
      All systems operational
    </a>
  );
}
