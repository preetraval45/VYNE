"use client";

import { useEffect, useState } from "react";
import {
  Palette,
  Image as ImageIcon,
  Code2,
  Share2,
  Users as UsersIcon,
  Star,
  Flag,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface Props {
  readonly onToast: (message: string) => void;
}

const STORAGE_KEY = "vyne-growth-settings";

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number; // 0..100
}

interface GrowthState {
  // White-label
  hideVyneBranding: boolean;
  whiteLabelName: string;
  whiteLabelDomain: string;
  emailFromName: string;
  emailFromAddress: string;

  // Branded login
  loginTagline: string;
  loginHeroImage: string;

  // Custom CSS
  customCss: string;

  // Referral
  referralCodePrefix: string;
  referralReward: string;

  // NPS
  npsEnabled: boolean;
  npsCadenceDays: number;

  // Feature flags
  flags: FeatureFlag[];
}

const DEFAULT_FLAGS: FeatureFlag[] = [
  {
    key: "ai-rerank-notifications",
    name: "AI re-rank notifications",
    description: "Enable the ✨ AI rank button on the notification panel.",
    enabled: true,
    rollout: 100,
  },
  {
    key: "whiteboard-blocks",
    name: "Whiteboard blocks in Docs",
    description: "Insert excalidraw-style whiteboards into documents.",
    enabled: true,
    rollout: 100,
  },
  {
    key: "voice-notes",
    name: "Voice notes in chat",
    description: "Mic button in the message composer.",
    enabled: true,
    rollout: 80,
  },
  {
    key: "screen-recording",
    name: "Screen recording attachments",
    description: "MonitorUp button in composer.",
    enabled: true,
    rollout: 50,
  },
  {
    key: "experimental-graph-rag",
    name: "Experimental: Graph RAG",
    description: "Cross-module AI search using graph-aware retrieval.",
    enabled: false,
    rollout: 5,
  },
];

const DEFAULT: GrowthState = {
  hideVyneBranding: false,
  whiteLabelName: "VYNE",
  whiteLabelDomain: "app.vyne.dev",
  emailFromName: "VYNE",
  emailFromAddress: "noreply@vyne.dev",
  loginTagline: "Sign in to your AI-native workspace",
  loginHeroImage: "",
  customCss: `/* Custom CSS injected only for this tenant.
   Variables you can override:
   --vyne-purple, --vyne-purple-light, --vyne-purple-dark
   --content-bg, --content-secondary, --content-border
   --text-primary, --text-secondary, --text-tertiary */

.sidebar-bg { /* example */ }
`,
  referralCodePrefix: "VYNE",
  referralReward: "$50 credit per converted referral · 30-day attribution",
  npsEnabled: false,
  npsCadenceDays: 90,
  flags: DEFAULT_FLAGS,
};

function loadState(): GrowthState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<GrowthState>) };
  } catch {
    return DEFAULT;
  }
}

function saveState(state: GrowthState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export default function GrowthSettings({ onToast }: Props) {
  const [state, setState] = useState<GrowthState>(DEFAULT);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  function update<K extends keyof GrowthState>(key: K, value: GrowthState[K]) {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      saveState(next);
      return next;
    });
  }

  function copy(text: string, key: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
      })
      .catch(() => onToast("Could not copy"));
  }

  function toggleFlag(idx: number) {
    setState((prev) => {
      const flags = prev.flags.map((f, i) =>
        i === idx ? { ...f, enabled: !f.enabled } : f,
      );
      const next = { ...prev, flags };
      saveState(next);
      return next;
    });
  }

  function setRollout(idx: number, value: number) {
    setState((prev) => {
      const flags = prev.flags.map((f, i) =>
        i === idx ? { ...f, rollout: value } : f,
      );
      const next = { ...prev, flags };
      saveState(next);
      return next;
    });
  }

  function addFlag() {
    setState((prev) => {
      const next: GrowthState = {
        ...prev,
        flags: [
          ...prev.flags,
          {
            key: `flag-${Date.now()}`,
            name: "New flag",
            description: "Describe what it gates.",
            enabled: false,
            rollout: 0,
          },
        ],
      };
      saveState(next);
      return next;
    });
  }

  function removeFlag(idx: number) {
    setState((prev) => {
      const next = { ...prev, flags: prev.flags.filter((_, i) => i !== idx) };
      saveState(next);
      return next;
    });
  }

  // Generated values
  const referralLink = `https://${state.whiteLabelDomain}/?ref=${state.referralCodePrefix}-DEMO-USR-1`;
  const embedSnippet = `<script src="https://${state.whiteLabelDomain}/embed/widget.js" data-vyne-widget="kanban" data-tenant="demo-org"></script>
<div id="vyne-widget"></div>`;

  return (
    <div>
      {/* ── White-label ─────────────────────────────────────── */}
      <Card title="White-label" icon={Palette}>
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Re-skin VYNE as your own product for resellers. Custom domain, name,
          and outbound email — every surface respects these.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <Field label="Product name">
            <input
              value={state.whiteLabelName}
              onChange={(e) => update("whiteLabelName", e.target.value)}
              placeholder="VYNE"
              aria-label="Product name"
              style={inputStyle}
            />
          </Field>
          <Field label="Custom domain">
            <input
              value={state.whiteLabelDomain}
              onChange={(e) => update("whiteLabelDomain", e.target.value)}
              placeholder="app.acme.com"
              aria-label="Custom domain"
              style={inputStyle}
            />
          </Field>
          <Field label="Email from-name">
            <input
              value={state.emailFromName}
              onChange={(e) => update("emailFromName", e.target.value)}
              aria-label="Email from name"
              style={inputStyle}
            />
          </Field>
          <Field label="Email from-address">
            <input
              value={state.emailFromAddress}
              onChange={(e) => update("emailFromAddress", e.target.value)}
              aria-label="Email from address"
              style={inputStyle}
            />
          </Field>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            fontSize: 13,
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={state.hideVyneBranding}
            onChange={(e) => update("hideVyneBranding", e.target.checked)}
            style={{ accentColor: "#06B6D4" }}
          />
          Hide &ldquo;Powered by VYNE&rdquo; on customer-facing pages
        </label>
      </Card>

      {/* ── Custom branded login ────────────────────────────── */}
      <Card title="Branded login page" icon={ImageIcon}>
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Customise the public sign-in page that visitors hit when they
          navigate to your custom domain.
        </p>
        <Field label="Tagline">
          <input
            value={state.loginTagline}
            onChange={(e) => update("loginTagline", e.target.value)}
            aria-label="Tagline"
            style={inputStyle}
          />
        </Field>
        <Field label="Hero image URL (optional)">
          <input
            value={state.loginHeroImage}
            onChange={(e) => update("loginHeroImage", e.target.value)}
            placeholder="https://cdn.acme.com/login-hero.jpg"
            aria-label="Hero image URL"
            style={inputStyle}
          />
        </Field>
        <a
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginTop: 10,
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--vyne-purple)",
            background: "transparent",
            color: "var(--vyne-purple)",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <ExternalLink size={12} /> Preview
        </a>
      </Card>

      {/* ── Custom CSS ─────────────────────────────────────── */}
      <Card title="Custom CSS" icon={Code2}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Inject CSS that loads on every page for your tenant only. Use it to
          override theme variables, fonts, accent colours, or hide elements.
        </p>
        <textarea
          value={state.customCss}
          onChange={(e) => update("customCss", e.target.value)}
          rows={8}
          aria-label="Custom CSS"
          style={{
            ...inputStyle,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontSize: 12,
            resize: "vertical",
            minHeight: 140,
          }}
        />
      </Card>

      {/* ── Embed widgets ──────────────────────────────────── */}
      <Card title="Embed VYNE widgets" icon={Share2}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Drop a widget into any customer-facing site or doc. Auto-syncs with
          your workspace, respects access scopes.
        </p>
        <div style={{ position: "relative" }}>
          <pre
            style={{
              padding: 14,
              borderRadius: 9,
              background: "var(--sidebar-bg)",
              color: "var(--content-border)",
              fontSize: 11,
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              overflowX: "auto",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
{embedSnippet}
          </pre>
          <button
            type="button"
            onClick={() => copy(embedSnippet, "embed")}
            aria-label="Copy embed snippet"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 5,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: copiedKey === "embed" ? "#4ADE80" : "#A0A0B8",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copiedKey === "embed" ? <Check size={10} /> : <Copy size={10} />}
            {copiedKey === "embed" ? "Copied" : "Copy"}
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[
            "kanban",
            "incidents",
            "stats",
            "ai-chat",
            "docs-search",
            "status-badge",
          ].map((w) => (
            <code
              key={w}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                background: "var(--content-secondary)",
                color: "var(--text-secondary)",
                fontSize: 11,
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                textAlign: "center",
              }}
            >
              data-vyne-widget=&quot;{w}&quot;
            </code>
          ))}
        </div>
      </Card>

      {/* ── Referral program ──────────────────────────────── */}
      <Card title="Referral program" icon={UsersIcon}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Reward existing users for sending VYNE to peers. Stripe credit applied
          automatically on conversion.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <Field label="Code prefix">
            <input
              value={state.referralCodePrefix}
              onChange={(e) => update("referralCodePrefix", e.target.value)}
              aria-label="Code prefix"
              style={inputStyle}
            />
          </Field>
          <Field label="Reward">
            <input
              value={state.referralReward}
              onChange={(e) => update("referralReward", e.target.value)}
              aria-label="Reward"
              style={inputStyle}
            />
          </Field>
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 9,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <Stat label="Tracked clicks" value="284" />
          <Stat label="Sign-ups" value="42" />
          <Stat label="Paid conversions" value="11" sub="$1,250 in credit issued" />
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            value={referralLink}
            readOnly
            aria-label="Your referral link"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => copy(referralLink, "ref")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 12px",
              borderRadius: 7,
              border: "1px solid var(--vyne-purple)",
              background: "transparent",
              color: "var(--vyne-purple)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copiedKey === "ref" ? <Check size={12} /> : <Copy size={12} />}
            {copiedKey === "ref" ? "Copied" : "Copy link"}
          </button>
        </div>
      </Card>

      {/* ── Partner portal ──────────────────────────────── */}
      <Card title="Partner portal" icon={UsersIcon}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Resellers and integrators get their own portal at{" "}
          <code>/partners</code> — co-branded marketing assets, MDF requests,
          and a deal-registration board.
        </p>
        <a
          href="/partners"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-purple)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <ExternalLink size={12} /> Open partner portal
        </a>
      </Card>

      {/* ── NPS ───────────────────────────────────────────── */}
      <Card title="NPS surveys" icon={Star}>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Show a single-tap NPS prompt in-app. Results feed customer-health
          scoring and the analytics dashboard.
        </p>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text-primary)",
            cursor: "pointer",
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={state.npsEnabled}
            onChange={(e) => update("npsEnabled", e.target.checked)}
            style={{ accentColor: "#06B6D4" }}
          />
          Enable NPS prompts
        </label>
        <Field label={`Survey cadence (${state.npsCadenceDays} days)`}>
          <input
            type="range"
            min={30}
            max={180}
            step={15}
            value={state.npsCadenceDays}
            onChange={(e) => update("npsCadenceDays", Number(e.target.value))}
            aria-label="Survey cadence"
            style={{ width: "100%", accentColor: "#06B6D4" }}
          />
        </Field>
      </Card>

      {/* ── Feature flags ─────────────────────────────────── */}
      <Card
        title="Feature flag dashboard"
        icon={Flag}
        action={
          <button
            type="button"
            onClick={addFlag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              background: "var(--vyne-purple)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={11} /> New flag
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {state.flags.map((f, idx) => {
            const onValue: "true" | "false" = f.enabled ? "true" : "false";
            return (
              <div
                key={f.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 10,
                  borderRadius: 9,
                  border: `1px solid ${f.enabled ? "var(--badge-success-text)" : "var(--content-border)"}`,
                  background: f.enabled
                    ? "var(--badge-success-bg)"
                    : "var(--content-secondary)",
                }}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={onValue}
                  aria-label={`Toggle ${f.name}`}
                  onClick={() => toggleFlag(idx)}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: f.enabled
                      ? "var(--vyne-purple)"
                      : "var(--content-border)",
                    border: "none",
                    position: "relative",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 3,
                      left: f.enabled ? 18 : 3,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                    }}
                  />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {f.name}
                    </span>
                    <code
                      style={{
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "var(--content-bg)",
                        color: "var(--text-tertiary)",
                        fontFamily:
                          "var(--font-geist-mono), ui-monospace, monospace",
                        fontSize: 10,
                      }}
                    >
                      {f.key}
                    </code>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginTop: 1,
                    }}
                  >
                    {f.description}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 3,
                    minWidth: 130,
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={f.rollout}
                    onChange={(e) => setRollout(idx, Number(e.target.value))}
                    aria-label={`Rollout for ${f.name}`}
                    style={{ width: 110, accentColor: "#06B6D4" }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {f.rollout}% rollout
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${f.name}`}
                  onClick={() => removeFlag(idx)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: "1px solid var(--content-border)",
                    background: "var(--content-bg)",
                    color: "var(--status-danger)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Card({
  title,
  icon: Icon,
  action,
  children,
}: Readonly<{
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon size={14} style={{ color: "var(--vyne-purple)" }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            flex: 1,
          }}
        >
          {title}
        </span>
        {action}
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
