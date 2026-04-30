"use client";

import { useEffect, useState } from "react";
import {
  Github,
  CheckCircle2,
  Plug,
  ArrowRight,
  Slack,
  MessageSquare,
  Briefcase,
  Loader2,
  Trash2,
  Plus,
  Mail,
  CalendarDays,
  Copy,
  RefreshCw,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  blurb: string;
  icon: React.ElementType;
  color: string;
  status: "connected" | "available";
  connectedAt?: string;
  meta?: string;
}

const STORAGE_KEY = "vyne-integrations";

const SEED: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    blurb:
      "Auto-link issues ↔ PRs, surface deploy status from Actions, sync labels both ways.",
    icon: Github,
    color: "var(--text-primary)",
    status: "available",
  },
  {
    id: "jira",
    name: "Jira (import)",
    blurb:
      "One-click migration: projects, issues, sprints, attachments, comments — preserves IDs.",
    icon: Briefcase,
    color: "#0052CC",
    status: "available",
  },
  {
    id: "linear",
    name: "Linear (import)",
    blurb:
      "Pull every team, cycle, project, and issue from your Linear workspace.",
    icon: Briefcase,
    color: "#5E6AD2",
    status: "available",
  },
  {
    id: "slack",
    name: "Slack bridge",
    blurb:
      "Read-only mirror of selected Slack channels into VYNE chat. Threads + files preserved.",
    icon: Slack,
    color: "#E01E5A",
    status: "available",
  },
  {
    id: "teams",
    name: "Microsoft Teams bridge",
    blurb: "Bridge a Teams channel into VYNE so AI can summarise + search across both.",
    icon: MessageSquare,
    color: "#5059C9",
    status: "available",
  },
];

interface ImportRunState {
  source: "jira" | "linear";
  step: "instance" | "scope" | "running" | "done";
  url?: string;
  scope?: { issues: boolean; comments: boolean; attachments: boolean; sprints: boolean };
  progress?: number;
  importedCount?: number;
}

interface BridgeMapping {
  remote: string;
  vyne: string;
}

interface Props {
  readonly onToast: (message: string) => void;
}

export default function IntegrationsSettings({ onToast }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>(SEED);
  const [importRun, setImportRun] = useState<ImportRunState | null>(null);
  const [bridgeOpen, setBridgeOpen] = useState<"slack" | "teams" | null>(null);
  const [bridgeMappings, setBridgeMappings] = useState<BridgeMapping[]>([]);
  const [newBridgeRemote, setNewBridgeRemote] = useState("");
  const [newBridgeVyne, setNewBridgeVyne] = useState("");

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as {
        integrations?: Integration[];
        bridgeMappings?: BridgeMapping[];
      };
      if (stored.integrations) {
        setIntegrations((prev) =>
          prev.map((p) => stored.integrations?.find((s) => s.id === p.id) ?? p),
        );
      }
      if (stored.bridgeMappings) setBridgeMappings(stored.bridgeMappings);
    } catch {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ integrations, bridgeMappings }),
      );
    } catch {
      // ignore
    }
  }, [integrations, bridgeMappings]);

  function disconnect(id: string) {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: "available", connectedAt: undefined, meta: undefined }
          : i,
      ),
    );
    onToast(`${id} disconnected`);
  }

  function connectGithub() {
    const popupHint =
      "https://github.com/apps/vyne — install the GitHub App to grant access.";
    const url =
      "https://github.com/apps/vyne/installations/new?state=demo-org";
    const win = globalThis.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      onToast(popupHint);
    }
    // Optimistic: pretend the install succeeded after the popup
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === "github"
            ? {
                ...i,
                status: "connected",
                connectedAt: new Date().toISOString().slice(0, 10),
                meta: "preet-raval/vyne · 4 repos",
              }
            : i,
        ),
      );
      onToast("GitHub App installed (demo)");
    }, 1200);
  }

  function startImport(source: "jira" | "linear") {
    setImportRun({ source, step: "instance" });
  }

  function advanceImport() {
    setImportRun((prev) => {
      if (!prev) return null;
      if (prev.step === "instance") {
        if (!prev.url?.trim()) {
          onToast("Enter your instance URL");
          return prev;
        }
        return {
          ...prev,
          step: "scope",
          scope: { issues: true, comments: true, attachments: true, sprints: true },
        };
      }
      if (prev.step === "scope") {
        return { ...prev, step: "running", progress: 0, importedCount: 0 };
      }
      return prev;
    });
  }

  // Drive the running state forward
  useEffect(() => {
    if (importRun?.step !== "running") return;
    const total = importRun.source === "jira" ? 1840 : 1240;
    const interval = setInterval(() => {
      setImportRun((prev) => {
        if (!prev || prev.step !== "running") return prev;
        const next = (prev.progress ?? 0) + 8 + Math.floor(Math.random() * 6);
        if (next >= 100) {
          return {
            ...prev,
            progress: 100,
            importedCount: total,
            step: "done",
          };
        }
        return {
          ...prev,
          progress: next,
          importedCount: Math.round((next / 100) * total),
        };
      });
    }, 220);
    return () => clearInterval(interval);
  }, [importRun?.step]);

  function finishImport() {
    if (!importRun) return;
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === importRun.source
          ? {
              ...i,
              status: "connected",
              connectedAt: new Date().toISOString().slice(0, 10),
              meta: `${importRun.importedCount?.toLocaleString() ?? ""} items imported`,
            }
          : i,
      ),
    );
    onToast(
      `Imported ${importRun.importedCount?.toLocaleString() ?? "0"} items from ${importRun.source}`,
    );
    setImportRun(null);
  }

  function addMapping() {
    const remote = newBridgeRemote.trim();
    const vyne = newBridgeVyne.trim();
    if (!remote || !vyne) {
      onToast("Enter both source and destination channels");
      return;
    }
    setBridgeMappings((prev) => [...prev, { remote, vyne }]);
    setNewBridgeRemote("");
    setNewBridgeVyne("");
  }

  function removeMapping(idx: number) {
    setBridgeMappings((prev) => prev.filter((_, i) => i !== idx));
  }

  function saveBridge() {
    if (!bridgeOpen) return;
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === bridgeOpen
          ? {
              ...i,
              status: "connected",
              connectedAt: new Date().toISOString().slice(0, 10),
              meta: `${bridgeMappings.length} channel${bridgeMappings.length === 1 ? "" : "s"} mirrored`,
            }
          : i,
      ),
    );
    onToast(`${bridgeOpen} bridge saved`);
    setBridgeOpen(null);
  }

  return (
    <div>
      {/* Active integrations */}
      {integrations.some((i) => i.status === "connected") && (
        <Section title="Connected">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {integrations
              .filter((i) => i.status === "connected")
              .map((i) => (
                <Row
                  key={i.id}
                  integration={i}
                  onConnect={() => onConnectByType(i.id)}
                  onDisconnect={() => disconnect(i.id)}
                />
              ))}
          </div>
        </Section>
      )}

      {/* Available */}
      <Section
        title="Available"
        subtitle="Connect external systems to bring their data into VYNE."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {integrations
            .filter((i) => i.status === "available")
            .map((i) => (
              <Row
                key={i.id}
                integration={i}
                onConnect={() => onConnectByType(i.id)}
                onDisconnect={() => disconnect(i.id)}
              />
            ))}
        </div>
      </Section>

      {/* Email-to-issue */}
      <EmailToIssueSection onToast={onToast} />

      {/* Calendar sync */}
      <CalendarSyncSection onToast={onToast} />

      {/* Import wizard modal */}
      {importRun && (
        <Modal
          title={`Import from ${importRun.source === "jira" ? "Jira" : "Linear"}`}
          onClose={() => setImportRun(null)}
        >
          {importRun.step === "instance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Step 1 of 3 — paste your{" "}
                {importRun.source === "jira" ? "Jira Cloud" : "Linear"}{" "}
                workspace URL. We&apos;ll request read-only access via OAuth.
              </p>
              <input
                value={importRun.url ?? ""}
                onChange={(e) =>
                  setImportRun((prev) =>
                    prev ? { ...prev, url: e.target.value } : prev,
                  )
                }
                placeholder={
                  importRun.source === "jira"
                    ? "https://acme.atlassian.net"
                    : "linear.app/acme"
                }
                aria-label="Workspace URL"
                style={inputStyle}
              />
              <ModalActions
                onCancel={() => setImportRun(null)}
                onPrimary={advanceImport}
                primaryLabel="Continue"
              />
            </div>
          )}

          {importRun.step === "scope" && importRun.scope && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Step 2 of 3 — pick what to import.
              </p>
              {(
                [
                  ["issues", "Issues + descriptions"],
                  ["comments", "Comments + activity"],
                  ["attachments", "Attachments + uploaded files"],
                  ["sprints", "Sprints / cycles"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={importRun.scope?.[key] ?? false}
                    onChange={(e) =>
                      setImportRun((prev) =>
                        prev?.scope
                          ? {
                              ...prev,
                              scope: { ...prev.scope, [key]: e.target.checked },
                            }
                          : prev,
                      )
                    }
                    style={{ accentColor: "var(--vyne-accent, #06B6D4)", width: 16, height: 16 }}
                  />
                  {label}
                </label>
              ))}
              <ModalActions
                onCancel={() => setImportRun(null)}
                onPrimary={advanceImport}
                primaryLabel="Start import"
              />
            </div>
          )}

          {importRun.step === "running" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Loader2 size={14} className="animate-spin" />
                Step 3 of 3 — importing… you can close this and we&apos;ll keep
                going in the background.
              </p>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: "var(--content-secondary)",
                  overflow: "hidden",
                  border: "1px solid var(--content-border)",
                }}
              >
                <div
                  style={{
                    width: `${importRun.progress ?? 0}%`,
                    height: "100%",
                    background:
                      "linear-gradient(90deg, var(--vyne-accent, #06B6D4), var(--vyne-accent-light, #22D3EE))",
                    transition: "width 0.2s",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  fontFamily:
                    "var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                {importRun.progress?.toFixed(0)}% · {(
                  importRun.importedCount ?? 0
                ).toLocaleString()}{" "}
                items imported
              </div>
            </div>
          )}

          {importRun.step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  background: "var(--badge-success-bg)",
                  border: "1px solid var(--badge-success-text)",
                  color: "var(--badge-success-text)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} />
                Imported {importRun.importedCount?.toLocaleString()} items.
              </div>
              <ModalActions
                onCancel={() => setImportRun(null)}
                onPrimary={finishImport}
                primaryLabel="Done"
              />
            </div>
          )}
        </Modal>
      )}

      {/* Bridge wizard modal */}
      {bridgeOpen && (
        <Modal
          title={`${bridgeOpen === "slack" ? "Slack" : "Teams"} bridge`}
          onClose={() => setBridgeOpen(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Map remote channels into VYNE channels. Messages stay read-only
              on the source side; AI search and summaries run across both.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {bridgeMappings.length === 0 && (
                <div
                  style={{
                    padding: 12,
                    border: "1px dashed var(--content-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    textAlign: "center",
                  }}
                >
                  No mappings yet — add one below.
                </div>
              )}
              {bridgeMappings.map((m, idx) => (
                <div
                  key={`${m.remote}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid var(--content-border)",
                    background: "var(--content-secondary)",
                    fontSize: 12,
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                      color: "var(--text-primary)",
                    }}
                  >
                    {m.remote}
                  </code>
                  <ArrowRight
                    size={12}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <code
                    style={{
                      flex: 1,
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                      color: "var(--vyne-accent, var(--vyne-purple))",
                    }}
                  >
                    {m.vyne}
                  </code>
                  <button
                    type="button"
                    aria-label={`Remove ${m.remote}`}
                    onClick={() => removeMapping(idx)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 5,
                      border: "1px solid var(--content-border)",
                      background: "var(--content-bg)",
                      color: "var(--status-danger)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newBridgeRemote}
                onChange={(e) => setNewBridgeRemote(e.target.value)}
                placeholder={
                  bridgeOpen === "slack" ? "#slack-channel" : "Teams channel name"
                }
                aria-label="Source channel"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                value={newBridgeVyne}
                onChange={(e) => setNewBridgeVyne(e.target.value)}
                placeholder="#vyne-channel"
                aria-label="Destination channel"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={addMapping}
                aria-label="Add mapping"
                style={{
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--vyne-accent, var(--vyne-purple))",
                  background: "var(--content-bg)",
                  color: "var(--vyne-accent, var(--vyne-purple))",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <ModalActions
              onCancel={() => setBridgeOpen(null)}
              onPrimary={saveBridge}
              primaryLabel={`Save ${bridgeOpen} bridge`}
            />
          </div>
        </Modal>
      )}
    </div>
  );

  function onConnectByType(id: string) {
    if (id === "github") return connectGithub();
    if (id === "jira") return startImport("jira");
    if (id === "linear") return startImport("linear");
    if (id === "slack") {
      setBridgeMappings([{ remote: "#general", vyne: "#general-mirror" }]);
      return setBridgeOpen("slack");
    }
    if (id === "teams") {
      setBridgeMappings([{ remote: "All hands", vyne: "#all-hands-mirror" }]);
      return setBridgeOpen("teams");
    }
  }
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

function Section({
  title,
  subtitle,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
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
        }}
      >
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
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Row({
  integration: i,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const Icon = i.icon;
  const isConnected = i.status === "connected";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: 12,
        borderRadius: 10,
        border: `1px solid ${isConnected ? "var(--badge-success-text)" : "var(--content-border)"}`,
        background: isConnected
          ? "var(--badge-success-bg)"
          : "var(--content-secondary)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: `${i.color}18`,
          color: i.color,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {i.name}
          </span>
          {isConnected && (
            <span
              style={{
                padding: "1px 8px",
                borderRadius: 999,
                background: "var(--badge-success-text)",
                color: "var(--content-bg)",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Connected
            </span>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {i.blurb}
        </p>
        {isConnected && i.meta && (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}
          >
            {i.meta} · since {i.connectedAt}
          </p>
        )}
      </div>
      {isConnected ? (
        <button
          type="button"
          onClick={onDisconnect}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--status-danger)",
            background: "transparent",
            color: "var(--status-danger)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Plug size={12} />
          Connect
        </button>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 250,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onPrimary,
  primaryLabel,
}: {
  onCancel: () => void;
  onPrimary: () => void;
  primaryLabel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 6,
      }}
    >
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          color: "var(--text-secondary)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onPrimary}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: "var(--vyne-accent, var(--vyne-purple))",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

const EMAIL_KEY = "vyne-email-to-issue";

function EmailToIssueSection({
  onToast,
}: Readonly<{ onToast: (m: string) => void }>) {
  const [project, setProject] = useState("ENG");
  const [inboxId, setInboxId] = useState("a8k3m2");
  const [defaultLabel, setDefaultLabel] = useState("support");
  const [stripSignatures, setStripSignatures] = useState(true);
  const [threadReplies, setThreadReplies] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(EMAIL_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.project) setProject(s.project);
      if (s.inboxId) setInboxId(s.inboxId);
      if (s.defaultLabel) setDefaultLabel(s.defaultLabel);
      if (typeof s.stripSignatures === "boolean")
        setStripSignatures(s.stripSignatures);
      if (typeof s.threadReplies === "boolean") setThreadReplies(s.threadReplies);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        EMAIL_KEY,
        JSON.stringify({
          project,
          inboxId,
          defaultLabel,
          stripSignatures,
          threadReplies,
        }),
      );
    } catch {}
  }, [project, inboxId, defaultLabel, stripSignatures, threadReplies]);

  const address = `${project.toLowerCase()}+${inboxId}@inbox.vyne.dev`;

  function copy() {
    navigator.clipboard?.writeText(address);
    onToast("Inbox address copied");
  }

  function regenerate() {
    const n = Math.random().toString(36).slice(2, 8);
    setInboxId(n);
    onToast("Inbox address rotated — update forwarding rules");
  }

  return (
    <Section
      title="Email-to-issue"
      subtitle="Forward or CC an email to turn it into a VYNE issue. Replies stay threaded."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 10,
            borderRadius: 9,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
          }}
        >
          <Mail size={14} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
          <code
            style={{
              flex: 1,
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              fontSize: 12.5,
              color: "var(--text-primary)",
            }}
          >
            {address}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy address"
            style={miniBtn}
          >
            <Copy size={11} /> Copy
          </button>
          <button
            type="button"
            onClick={regenerate}
            aria-label="Rotate address"
            style={miniBtn}
          >
            <RefreshCw size={11} /> Rotate
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FieldBlock label="Target project">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              aria-label="Target project"
              style={{ ...inputStyle, width: "100%" }}
            >
              <option value="ENG">Engineering (ENG)</option>
              <option value="OPS">Operations (OPS)</option>
              <option value="SUP">Customer support (SUP)</option>
              <option value="SALES">Sales (SALES)</option>
            </select>
          </FieldBlock>
          <FieldBlock label="Default label">
            <input
              value={defaultLabel}
              onChange={(e) => setDefaultLabel(e.target.value)}
              aria-label="Default label"
              style={{ ...inputStyle, width: "100%" }}
            />
          </FieldBlock>
        </div>

        <label style={toggleRow}>
          <input
            type="checkbox"
            checked={stripSignatures}
            onChange={(e) => setStripSignatures(e.target.checked)}
            style={{ accentColor: "var(--vyne-accent, #06B6D4)", width: 16, height: 16 }}
          />
          <span>
            <strong>Strip email signatures</strong> from the issue body — keeps
            descriptions clean.
          </span>
        </label>
        <label style={toggleRow}>
          <input
            type="checkbox"
            checked={threadReplies}
            onChange={(e) => setThreadReplies(e.target.checked)}
            style={{ accentColor: "var(--vyne-accent, #06B6D4)", width: 16, height: 16 }}
          />
          <span>
            <strong>Thread replies</strong> to the same issue — uses In-Reply-To
            + References headers.
          </span>
        </label>
      </div>
    </Section>
  );
}

const CAL_KEY = "vyne-calendar-sync";

interface CalConn {
  provider: "google" | "outlook";
  account: string;
  direction: "twoWay" | "pullOnly" | "pushOnly";
  showBusy: boolean;
  importInvites: boolean;
  lastSync: string;
}

function CalendarSyncSection({
  onToast,
}: Readonly<{ onToast: (m: string) => void }>) {
  const [conn, setConn] = useState<CalConn | null>(null);
  const [connecting, setConnecting] = useState<"google" | "outlook" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CAL_KEY);
      if (raw) setConn(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (conn) localStorage.setItem(CAL_KEY, JSON.stringify(conn));
      else localStorage.removeItem(CAL_KEY);
    } catch {}
  }, [conn]);

  function connect(provider: "google" | "outlook") {
    setConnecting(provider);
    setTimeout(() => {
      setConn({
        provider,
        account:
          provider === "google" ? "preet@vyne.dev" : "preet@vyne.onmicrosoft.com",
        direction: "twoWay",
        showBusy: true,
        importInvites: true,
        lastSync: new Date().toISOString(),
      });
      setConnecting(null);
      onToast(`${provider === "google" ? "Google" : "Outlook"} Calendar connected`);
    }, 900);
  }

  function update(partial: Partial<CalConn>) {
    setConn((c) => (c ? { ...c, ...partial } : c));
  }

  function disconnect() {
    setConn(null);
    onToast("Calendar disconnected");
  }

  function syncNow() {
    update({ lastSync: new Date().toISOString() });
    onToast("Calendar sync queued");
  }

  return (
    <Section
      title="Calendar integration"
      subtitle="Two-way sync with Google or Outlook — meetings show in your VYNE schedule, VYNE events appear in your calendar."
    >
      {!conn ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {(
            [
              {
                id: "google",
                label: "Google Calendar",
                sub: "Workspace or personal Gmail",
              },
              {
                id: "outlook",
                label: "Microsoft Outlook",
                sub: "Microsoft 365 / Exchange Online",
              },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => connect(p.id)}
              disabled={connecting !== null}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderRadius: 10,
                border: "1px solid var(--content-border)",
                background: "var(--content-secondary)",
                cursor: connecting ? "default" : "pointer",
                textAlign: "left",
              }}
            >
              <CalendarDays size={18} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  {p.sub}
                </div>
              </div>
              {connecting === p.id ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                  style={{ color: "var(--vyne-accent, var(--vyne-purple))" }}
                />
              ) : (
                <Plug size={14} style={{ color: "var(--text-tertiary)" }} />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 10,
              background: "var(--badge-success-bg)",
              border: "1px solid var(--badge-success-text)",
            }}
          >
            <CheckCircle2
              size={15}
              style={{ color: "var(--badge-success-text)" }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--badge-success-text)",
                }}
              >
                {conn.provider === "google" ? "Google" : "Outlook"} Calendar
                connected
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginTop: 1,
                }}
              >
                {conn.account} · last sync{" "}
                {new Date(conn.lastSync).toLocaleString()}
              </div>
            </div>
            <button type="button" onClick={syncNow} style={miniBtn}>
              <RefreshCw size={11} /> Sync now
            </button>
            <button
              type="button"
              onClick={disconnect}
              style={{
                ...miniBtn,
                color: "var(--status-danger)",
                borderColor: "var(--content-border)",
              }}
            >
              Disconnect
            </button>
          </div>

          <FieldBlock label="Sync direction">
            <div style={{ display: "flex", gap: 6 }}>
              {(
                [
                  ["twoWay", "Two-way"],
                  ["pullOnly", "Pull only"],
                  ["pushOnly", "Push only"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => update({ direction: v })}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1.5px solid ${conn.direction === v ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
                    background:
                      conn.direction === v
                        ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.05)"
                        : "var(--content-bg)",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </FieldBlock>

          <label style={toggleRow}>
            <input
              type="checkbox"
              checked={conn.showBusy}
              onChange={(e) => update({ showBusy: e.target.checked })}
              style={{ accentColor: "var(--vyne-accent, #06B6D4)", width: 16, height: 16 }}
            />
            <span>
              <strong>Show busy status</strong> in VYNE based on calendar events
              (hides titles).
            </span>
          </label>
          <label style={toggleRow}>
            <input
              type="checkbox"
              checked={conn.importInvites}
              onChange={(e) => update({ importInvites: e.target.checked })}
              style={{ accentColor: "var(--vyne-accent, #06B6D4)", width: 16, height: 16 }}
            />
            <span>
              <strong>Import meeting invites</strong> as VYNE events with
              attendee + agenda sync.
            </span>
          </label>
        </div>
      )}
    </Section>
  );
}

const miniBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  fontSize: 12.5,
  color: "var(--text-secondary)",
  lineHeight: 1.5,
  cursor: "pointer",
};

function FieldBlock({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
    </div>
  );
}
