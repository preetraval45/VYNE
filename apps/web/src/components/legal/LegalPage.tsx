import Link from "next/link";
import { VyneLogo } from "@/components/brand/VyneLogo";

// PH-H — Shared chrome for the 5 legal pages (privacy, terms, dpa,
// cookie-policy, security). Keeps the visual presentation identical
// across all of them so they read as one document set, not five
// disconnected pages.

interface LegalPageProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalPageProps) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        color: "var(--text-primary)",
        minHeight: "100vh",
        fontFamily: "var(--font-display)",
      }}
    >
      <nav
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Link href="/">
          <VyneLogo variant="horizontal" markSize={26} />
        </Link>
        <div style={{ display: "flex", gap: 18 }}>
          {[
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/dpa", label: "DPA" },
            { href: "/security", label: "Security" },
            { href: "/cookie-policy", label: "Cookies" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      <article
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "48px 24px 96px",
          lineHeight: 1.7,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 12,
          }}
        >
          Last updated · {lastUpdated}
        </p>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            margin: "0 0 24px",
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            style={{
              fontSize: 16,
              color: "var(--text-secondary)",
              marginBottom: 32,
            }}
          >
            {subtitle}
          </p>
        ) : null}
        {children}
      </article>
    </div>
  );
}

interface SectionProps {
  heading: string;
  children: React.ReactNode;
}

export function Section({ heading, children }: SectionProps) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.015em",
          margin: "0 0 10px",
        }}
      >
        {heading}
      </h2>
      <div
        style={{
          fontSize: 15,
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        {children}
      </div>
    </section>
  );
}

// Table for the data-inventory + sub-processor lists. Renders semantic
// rows, dark-theme appropriate, mobile-stack via overflow-auto.
interface TableProps {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}

export function Table({ headers, rows }: TableProps) {
  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  borderBottom: "1px solid var(--content-border)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "8px 10px",
                    verticalAlign: "top",
                    borderBottom: "1px solid var(--content-border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
