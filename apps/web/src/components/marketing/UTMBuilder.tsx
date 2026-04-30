"use client";

import { useMemo, useState } from "react";
import { Link2, Copy, Check } from "lucide-react";

// ─── UTM Builder ───────────────────────────────────────────────────
//
// Composes a campaign tracking URL via URLSearchParams so empty fields
// don't appear in the output. All datalist options are suggestions
// only — the user can still type a custom value.

const SOURCES = ["google", "facebook", "linkedin", "twitter", "newsletter"];
const MEDIUMS = ["cpc", "social", "email", "organic", "referral"];

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
  listId?: string;
  options?: string[];
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  optional,
  listId,
  options,
}: Readonly<FieldProps>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
        {optional && (
          <span
            style={{
              marginLeft: 6,
              fontWeight: 400,
              color: "var(--text-tertiary)",
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            (optional)
          </span>
        )}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        style={{
          padding: "8px 10px",
          fontSize: 13,
          fontFamily: "inherit",
          color: "var(--text-primary)",
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          outline: "none",
        }}
      />
      {listId && options && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </div>
  );
}

export function UTMBuilder() {
  const [baseUrl, setBaseUrl] = useState("https://vyne.vercel.app");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalUrl = useMemo(() => {
    const trimmed = baseUrl.trim();
    if (!trimmed) return "";
    const params = new URLSearchParams();
    if (source.trim()) params.set("utm_source", source.trim());
    if (medium.trim()) params.set("utm_medium", medium.trim());
    if (campaign.trim()) params.set("utm_campaign", campaign.trim());
    if (term.trim()) params.set("utm_term", term.trim());
    if (content.trim()) params.set("utm_content", content.trim());
    const qs = params.toString();
    if (!qs) return trimmed;
    // Preserve any pre-existing query/hash on the base URL.
    try {
      const u = new URL(trimmed);
      params.forEach((v, k) => u.searchParams.set(k, v));
      return u.toString();
    } catch {
      const sep = trimmed.includes("?") ? "&" : "?";
      return `${trimmed}${sep}${qs}`;
    }
  }, [baseUrl, source, medium, campaign, term, content]);

  async function copyUrl() {
    if (!finalUrl) return;
    try {
      await navigator.clipboard.writeText(finalUrl);
      setError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setError("Clipboard unavailable in this browser");
    }
  }

  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Link2 size={15} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            UTM Builder
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Compose tracked campaign URLs
          </span>
        </div>
      </div>

      {/* Form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <Field
          id="utm-base"
          label="Base URL"
          value={baseUrl}
          onChange={setBaseUrl}
          placeholder="https://vyne.vercel.app"
        />
        <Field
          id="utm-source"
          label="utm_source"
          value={source}
          onChange={setSource}
          placeholder="google"
          listId="utm-source-list"
          options={SOURCES}
        />
        <Field
          id="utm-medium"
          label="utm_medium"
          value={medium}
          onChange={setMedium}
          placeholder="cpc"
          listId="utm-medium-list"
          options={MEDIUMS}
        />
        <Field
          id="utm-campaign"
          label="utm_campaign"
          value={campaign}
          onChange={setCampaign}
          placeholder="spring_launch_2026"
        />
        <Field
          id="utm-term"
          label="utm_term"
          value={term}
          onChange={setTerm}
          placeholder="ai+crm"
          optional
        />
        <Field
          id="utm-content"
          label="utm_content"
          value={content}
          onChange={setContent}
          placeholder="hero_cta"
          optional
        />
      </div>

      {/* Output */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Tracked URL
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <code
            style={{
              flex: 1,
              minWidth: 0,
              padding: "10px 12px",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              color: "var(--text-primary)",
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              borderRadius: 8,
              wordBreak: "break-all",
              whiteSpace: "pre-wrap",
            }}
          >
            {finalUrl || "(enter a base URL)"}
          </code>
          <button
            type="button"
            onClick={copyUrl}
            disabled={!finalUrl}
            aria-label="Copy URL"
            style={{
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background: finalUrl
                ? "var(--vyne-accent, var(--vyne-purple))"
                : "var(--text-tertiary)",
              border: "none",
              borderRadius: 8,
              cursor: finalUrl ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: finalUrl ? 1 : 0.7,
              flexShrink: 0,
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>
        {error && (
          <span
            role="alert"
            style={{ fontSize: 12, color: "var(--badge-danger-text)" }}
          >
            {error}
          </span>
        )}
      </div>
    </section>
  );
}

export default UTMBuilder;
