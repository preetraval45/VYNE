"use client";

import { useCallback, useState } from "react";
import { Copy, Eye, EyeOff, Plus, Trash2, Webhook, Key, Zap } from "lucide-react";

// ─── Shared UI ───────────────────────────────────────────────────
function SectionCard({
  title,
  subtitle,
  action,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
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
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────
interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  suffix: string;
  lastUsed: string;
  scope: "read" | "write" | "admin";
  createdAt: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: "active" | "paused" | "failing";
  lastDelivery: string;
  successRate: number;
}

const MOCK_KEYS: ApiKey[] = [
  {
    id: "key-prod",
    label: "Production (Zapier)",
    prefix: "vyne_live_",
    suffix: "a8k3",
    lastUsed: "2 minutes ago",
    scope: "write",
    createdAt: "2026-03-12",
  },
  {
    id: "key-readonly",
    label: "Read-only reporting",
    prefix: "vyne_live_",
    suffix: "9m2p",
    lastUsed: "3 hours ago",
    scope: "read",
    createdAt: "2026-02-28",
  },
];

const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: "wh-001",
    url: "https://zapier.com/hooks/catch/8142/order-created",
    events: ["order.created", "order.shipped"],
    status: "active",
    lastDelivery: "4 minutes ago",
    successRate: 99.8,
  },
  {
    id: "wh-002",
    url: "https://hooks.slack.com/services/T01/B02/xxxxx",
    events: ["incident.detected", "deploy.failed"],
    status: "active",
    lastDelivery: "1 hour ago",
    successRate: 100,
  },
];

const AVAILABLE_EVENTS = [
  "order.created",
  "order.updated",
  "order.shipped",
  "order.cancelled",
  "invoice.paid",
  "invoice.overdue",
  "issue.created",
  "issue.assigned",
  "issue.closed",
  "deploy.succeeded",
  "deploy.failed",
  "incident.detected",
  "incident.resolved",
  "user.invited",
  "user.joined",
];

// ─── Component ───────────────────────────────────────────────────
interface Props {
  readonly onToast: (message: string) => void;
}

export default function DeveloperSettings({ onToast }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(MOCK_WEBHOOKS);
  const [showPlaintextKey, setShowPlaintextKey] = useState<string | null>(null);
  const [newKeyOpen, setNewKeyOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyScope, setNewKeyScope] = useState<"read" | "write" | "admin">(
    "read",
  );
  const [newWebhookOpen, setNewWebhookOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<Set<string>>(
    new Set(["order.created"]),
  );

  const createKey = useCallback(() => {
    if (!newKeyLabel.trim()) {
      onToast("Please provide a label");
      return;
    }
    const random = Math.random().toString(36).slice(2, 10);
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      label: newKeyLabel,
      prefix: "vyne_live_",
      suffix: random.slice(-4),
      lastUsed: "Never",
      scope: newKeyScope,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setKeys((prev) => [newKey, ...prev]);
    setShowPlaintextKey(`vyne_live_${random}xxxx${random.slice(0, 12)}`);
    setNewKeyOpen(false);
    setNewKeyLabel("");
    onToast("API key created");
  }, [newKeyLabel, newKeyScope, onToast]);

  const revokeKey = useCallback(
    (id: string) => {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      onToast("API key revoked");
    },
    [onToast],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        onToast("Copied to clipboard");
      } catch {
        onToast("Could not access clipboard");
      }
    },
    [onToast],
  );

  const createWebhook = useCallback(() => {
    try {
      new URL(newWebhookUrl);
    } catch {
      onToast("Please enter a valid HTTPS URL");
      return;
    }
    if (newWebhookEvents.size === 0) {
      onToast("Select at least one event to subscribe to");
      return;
    }
    const wh: WebhookEndpoint = {
      id: `wh-${Date.now()}`,
      url: newWebhookUrl,
      events: Array.from(newWebhookEvents),
      status: "active",
      lastDelivery: "Never",
      successRate: 100,
    };
    setWebhooks((prev) => [wh, ...prev]);
    setNewWebhookOpen(false);
    setNewWebhookUrl("");
    setNewWebhookEvents(new Set(["order.created"]));
    onToast("Webhook added");
  }, [newWebhookUrl, newWebhookEvents, onToast]);

  const toggleEvent = useCallback((evt: string) => {
    setNewWebhookEvents((prev) => {
      const next = new Set(prev);
      if (next.has(evt)) next.delete(evt);
      else next.add(evt);
      return next;
    });
  }, []);

  const removeWebhook = useCallback(
    (id: string) => {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      onToast("Webhook removed");
    },
    [onToast],
  );

  return (
    <div>
      {/* ── API Keys ──────────────────────────────────────────── */}
      <SectionCard
        title="API Keys"
        subtitle="Use these keys to authenticate requests to the VYNE API."
        action={
          <button
            type="button"
            onClick={() => setNewKeyOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-purple)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Plus size={13} /> New key
          </button>
        }
      >
        {newKeyOpen && (
          <div
            style={{
              padding: 14,
              marginBottom: 14,
              borderRadius: 10,
              border: "1px dashed var(--vyne-purple)",
              background: "rgba(108,71,255,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <input
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Key label (e.g. Zapier integration)"
              aria-label="Key label"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              {(["read", "write", "admin"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewKeyScope(s)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${newKeyScope === s ? "var(--vyne-purple)" : "var(--content-border)"}`,
                    background:
                      newKeyScope === s
                        ? "rgba(108,71,255,0.1)"
                        : "var(--content-bg)",
                    color:
                      newKeyScope === s
                        ? "var(--vyne-purple)"
                        : "var(--text-secondary)",
                    textTransform: "capitalize",
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setNewKeyOpen(false)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createKey}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--vyne-purple)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create key
              </button>
            </div>
          </div>
        )}

        {showPlaintextKey && (
          <div
            style={{
              padding: 14,
              marginBottom: 14,
              borderRadius: 10,
              background: "var(--badge-warning-bg)",
              border: "1px solid var(--badge-warning-text)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Key size={16} style={{ color: "var(--badge-warning-text)" }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--badge-warning-text)",
                  marginBottom: 4,
                }}
              >
                Copy this key now — you won&apos;t see it again.
              </div>
              <div
                style={{
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  wordBreak: "break-all",
                }}
              >
                {showPlaintextKey}
              </div>
            </div>
            <button
              type="button"
              aria-label="Copy key"
              onClick={() => copy(showPlaintextKey)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: "none",
                background: "var(--badge-warning-text)",
                color: "var(--content-bg)",
                cursor: "pointer",
              }}
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setShowPlaintextKey(null)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: "1px solid var(--badge-warning-text)",
                background: "transparent",
                color: "var(--badge-warning-text)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {keys.length === 0 && (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              No API keys yet.
            </div>
          )}
          {keys.map((k) => (
            <div
              key={k.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--content-border)",
                background: "var(--content-secondary)",
              }}
            >
              <Key size={16} style={{ color: "var(--text-tertiary)" }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {k.prefix}•••••••••{k.suffix} · scope {k.scope} · last used{" "}
                  {k.lastUsed}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Revoke ${k.label}`}
                onClick={() => revokeKey(k.id)}
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--status-danger)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Webhooks ──────────────────────────────────────────── */}
      <SectionCard
        title="Outbound Webhooks"
        subtitle="Send events from VYNE to Zapier, Slack, or any HTTPS endpoint."
        action={
          <button
            type="button"
            onClick={() => setNewWebhookOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-purple)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Plus size={13} /> New webhook
          </button>
        }
      >
        {newWebhookOpen && (
          <div
            style={{
              padding: 14,
              marginBottom: 14,
              borderRadius: 10,
              border: "1px dashed var(--vyne-purple)",
              background: "rgba(108,71,255,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <input
              type="url"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              placeholder="https://your-endpoint.com/vyne"
              aria-label="Webhook URL"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Subscribe to events ({newWebhookEvents.size})
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  maxHeight: 120,
                  overflow: "auto",
                }}
              >
                {AVAILABLE_EVENTS.map((e) => {
                  const checked = newWebhookEvents.has(e);
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => toggleEvent(e)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily:
                          "var(--font-geist-mono), ui-monospace, monospace",
                        border: `1px solid ${checked ? "var(--vyne-purple)" : "var(--content-border)"}`,
                        background: checked
                          ? "rgba(108,71,255,0.12)"
                          : "var(--content-bg)",
                        color: checked
                          ? "var(--vyne-purple)"
                          : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setNewWebhookOpen(false)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createWebhook}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--vyne-purple)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Add webhook
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {webhooks.length === 0 && (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              No webhooks configured yet.
            </div>
          )}
          {webhooks.map((w) => (
            <div
              key={w.id}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid var(--content-border)",
                background: "var(--content-secondary)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <Webhook size={15} style={{ color: "var(--vyne-purple)" }} />
                <div
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {w.url}
                </div>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background:
                      w.status === "active"
                        ? "var(--badge-success-bg)"
                        : w.status === "paused"
                          ? "var(--content-secondary)"
                          : "var(--badge-danger-bg)",
                    color:
                      w.status === "active"
                        ? "var(--badge-success-text)"
                        : w.status === "paused"
                          ? "var(--text-secondary)"
                          : "var(--badge-danger-text)",
                    textTransform: "capitalize",
                  }}
                >
                  {w.status}
                </span>
                <button
                  type="button"
                  aria-label="Remove webhook"
                  onClick={() => removeWebhook(w.id)}
                  style={{
                    padding: 7,
                    borderRadius: 6,
                    border: "1px solid var(--content-border)",
                    background: "var(--content-bg)",
                    color: "var(--status-danger)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {w.events.map((e) => (
                  <span
                    key={e}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                      background: "var(--content-bg)",
                      border: "1px solid var(--content-border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {e}
                  </span>
                ))}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                Last delivery {w.lastDelivery} · {w.successRate}% success (30d)
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Quick links ──────────────────────────────────────── */}
      <SectionCard title="Developer resources">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          {[
            { label: "API reference", href: "https://docs.vyne.dev/api", icon: Key },
            { label: "Webhook guide", href: "https://docs.vyne.dev/webhooks", icon: Webhook },
            { label: "Event catalog", href: "https://docs.vyne.dev/events", icon: Zap },
          ].map((r) => (
            <a
              key={r.label}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 12,
                borderRadius: 10,
                border: "1px solid var(--content-border)",
                background: "var(--content-secondary)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <r.icon size={14} style={{ color: "var(--vyne-purple)" }} />
              {r.label}
            </a>
          ))}
        </div>
      </SectionCard>

      <button
        type="button"
        aria-label="toggle hidden"
        onClick={() => setShowPlaintextKey(showPlaintextKey ? null : "vyne_live_demo")}
        style={{ display: "none" }}
      >
        <Eye /><EyeOff />
      </button>
    </div>
  );
}
