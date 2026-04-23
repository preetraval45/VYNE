"use client";

import { useEffect, useState } from "react";
import { Download, Mail } from "lucide-react";

// The /api/waitlist POST handler writes to a KV/Blob store in prod. For the
// demo build we render fixture rows so the admin UI is reachable and can be
// styled + reviewed without the backend being live.

type Entry = {
  email: string;
  source: "hero" | "footer";
  createdAt: string;
};

const FIXTURE: Entry[] = [
  { email: "alex@acme.com", source: "hero", createdAt: "2026-04-22T14:22:00Z" },
  { email: "priya@northwind.io", source: "footer", createdAt: "2026-04-22T09:11:00Z" },
  { email: "sam@contoso.dev", source: "hero", createdAt: "2026-04-21T18:47:00Z" },
  { email: "morgan@globex.co", source: "hero", createdAt: "2026-04-21T10:02:00Z" },
  { email: "taylor@initech.io", source: "footer", createdAt: "2026-04-20T16:33:00Z" },
];

export default function WaitlistAdminPage() {
  const [entries, setEntries] = useState<Entry[]>(FIXTURE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/waitlist", { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as { entries?: Entry[] };
        if (!cancelled && Array.isArray(data.entries)) setEntries(data.entries);
      } catch {
        // stay on fixture
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function downloadCsv() {
    const header = "email,source,created_at";
    const rows = entries
      .map((e) => `${e.email},${e.source},${e.createdAt}`)
      .join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 28, maxWidth: 920, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              margin: "0 0 6px",
            }}
          >
            Admin · Marketing
          </p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Waitlist signups
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              margin: "4px 0 0",
            }}
          >
            {entries.length} total {loading ? "· syncing…" : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn-teal"
          onClick={downloadCsv}
          aria-label="Download CSV"
        >
          <Download size={14} /> Export CSV
        </button>
      </header>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Email</th>
              <th style={th}>Source</th>
              <th style={{ ...th, textAlign: "right" }}>Signed up</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.email + e.createdAt}
                style={{ borderTop: "1px solid var(--content-border)" }}
              >
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Mail size={14} color="var(--vyne-teal)" />
                    <a
                      href={`mailto:${e.email}`}
                      style={{
                        color: "var(--text-primary)",
                        textDecoration: "none",
                      }}
                    >
                      {e.email}
                    </a>
                  </div>
                </td>
                <td style={td}>
                  <span className="badge-teal">{e.source}</span>
                </td>
                <td style={{ ...td, textAlign: "right", color: "var(--text-tertiary)" }}>
                  {new Date(e.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "12px 18px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textAlign: "left",
  color: "var(--text-tertiary)",
  background: "var(--content-secondary)",
};

const td: React.CSSProperties = {
  padding: "14px 18px",
  fontSize: 14,
  color: "var(--text-primary)",
};
