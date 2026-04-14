"use client";

import { useCallback, useState } from "react";
import {
  Smartphone,
  Monitor,
  Globe,
  ShieldCheck,
  KeyRound,
  LogOut,
} from "lucide-react";

// ─── Shared UI ───────────────────────────────────────────────────
function SectionCard({
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
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────
interface Session {
  id: string;
  device: "desktop" | "mobile" | "tablet" | "other";
  deviceName: string;
  location: string;
  ip: string;
  lastActive: string;
  current?: boolean;
}

const MOCK_SESSIONS: Session[] = [
  {
    id: "s1",
    device: "desktop",
    deviceName: "Chrome 131 · Windows 11",
    location: "Charlotte, NC, USA",
    ip: "73.221.14.22",
    lastActive: "Active now",
    current: true,
  },
  {
    id: "s2",
    device: "mobile",
    deviceName: "Safari · iPhone 15 Pro",
    location: "Charlotte, NC, USA",
    ip: "73.221.14.22",
    lastActive: "4 hours ago",
  },
  {
    id: "s3",
    device: "desktop",
    deviceName: "VS Code · macOS",
    location: "Raleigh, NC, USA",
    ip: "98.14.201.88",
    lastActive: "2 days ago",
  },
];

const deviceIcon = (d: Session["device"]) => {
  if (d === "mobile" || d === "tablet") return Smartphone;
  return Monitor;
};

// ─── Component ───────────────────────────────────────────────────
interface Props {
  readonly onToast: (message: string) => void;
}

export default function SecuritySettings({ onToast }: Props) {
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);

  // 2FA state (client-only demo)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState<"idle" | "scan" | "verify">("idle");
  const [verifyCode, setVerifyCode] = useState("");

  // SSO state
  const [ssoProvider, setSsoProvider] = useState<"none" | "google" | "okta" | "azure">(
    "none",
  );

  // Password policy state
  const [policy, setPolicy] = useState({
    minLength: 12,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: false,
    rotationDays: 90,
  });

  const revokeSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      onToast("Session revoked");
    },
    [onToast],
  );

  const revokeAllOtherSessions = useCallback(() => {
    setSessions((prev) => prev.filter((s) => s.current));
    onToast("Signed out of all other sessions");
  }, [onToast]);

  const startTwoFactorSetup = useCallback(() => {
    setSetupStep("scan");
  }, []);

  const confirmTwoFactor = useCallback(() => {
    if (verifyCode.length !== 6) {
      onToast("Enter the 6-digit code from your authenticator");
      return;
    }
    setTwoFactorEnabled(true);
    setSetupStep("idle");
    setVerifyCode("");
    onToast("Two-factor authentication enabled");
  }, [verifyCode, onToast]);

  const disableTwoFactor = useCallback(() => {
    setTwoFactorEnabled(false);
    onToast("Two-factor authentication disabled");
  }, [onToast]);

  return (
    <div>
      {/* ── Password policy ──────────────────────────────────── */}
      <SectionCard
        title="Password policy"
        subtitle="Applies to all members of this workspace."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                Minimum length
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Characters required in every password
              </div>
            </div>
            <input
              type="number"
              min={8}
              max={64}
              value={policy.minLength}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, minLength: Number(e.target.value) }))
              }
              aria-label="Minimum password length"
              style={{
                width: 80,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                textAlign: "center",
                outline: "none",
              }}
            />
          </label>

          {([
            ["requireUppercase", "Require uppercase letter"],
            ["requireNumber", "Require number"],
            ["requireSymbol", "Require symbol (e.g. !@#$)"],
          ] as const).map(([key, label]) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                {label}
              </span>
              <input
                type="checkbox"
                checked={policy[key]}
                onChange={(e) =>
                  setPolicy((p) => ({ ...p, [key]: e.target.checked }))
                }
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#6C47FF" }}
              />
            </label>
          ))}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                Rotation period
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Days before users must change their password
              </div>
            </div>
            <select
              value={policy.rotationDays}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  rotationDays: Number(e.target.value),
                }))
              }
              aria-label="Rotation period"
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={0}>Never</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => onToast("Password policy saved")}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-purple)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save policy
        </button>
      </SectionCard>

      {/* ── Two-factor authentication ───────────────────────── */}
      <SectionCard
        title="Two-factor authentication"
        subtitle="Require a 6-digit code from an authenticator app on every sign-in."
      >
        {setupStep === "idle" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: twoFactorEnabled
                  ? "var(--badge-success-bg)"
                  : "var(--content-secondary)",
                color: twoFactorEnabled
                  ? "var(--badge-success-text)"
                  : "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {twoFactorEnabled ? "2FA is enabled" : "2FA is disabled"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                {twoFactorEnabled
                  ? "TOTP authenticator · verified 2 days ago"
                  : "We strongly recommend enabling 2FA for all admin accounts."}
              </div>
            </div>
            {twoFactorEnabled ? (
              <button
                type="button"
                onClick={disableTwoFactor}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--status-danger)",
                  background: "transparent",
                  color: "var(--status-danger)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Disable
              </button>
            ) : (
              <button
                type="button"
                onClick={startTwoFactorSetup}
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
                Enable 2FA
              </button>
            )}
          </div>
        )}

        {setupStep === "scan" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: 20,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 160,
                height: 160,
                background:
                  "repeating-linear-gradient(90deg, var(--text-primary) 0 4px, transparent 4px 8px), repeating-linear-gradient(0deg, var(--text-primary) 0 4px, transparent 4px 8px)",
                border: "6px solid var(--content-bg)",
                outline: "1px solid var(--content-border)",
                borderRadius: 8,
              }}
            />
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                textAlign: "center",
                maxWidth: 380,
              }}
            >
              Scan the QR code with Google Authenticator, 1Password, or Authy —
              then enter the 6-digit code to confirm.
            </div>
            <input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000 000"
              aria-label="Verification code"
              style={{
                width: 180,
                textAlign: "center",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 20,
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                letterSpacing: "0.2em",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setSetupStep("idle");
                  setVerifyCode("");
                }}
                style={{
                  padding: "8px 16px",
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
                onClick={confirmTwoFactor}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--vyne-purple)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Confirm & enable
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── SSO/SAML ──────────────────────────────────────── */}
      <SectionCard
        title="Single Sign-On"
        subtitle="Let members sign in with their company identity provider (Enterprise plan)."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {(["none", "google", "okta", "azure"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSsoProvider(p);
                onToast(
                  p === "none"
                    ? "SSO disabled"
                    : `Configure SSO with ${p.charAt(0).toUpperCase() + p.slice(1)}`,
                );
              }}
              style={{
                flex: "1 1 140px",
                padding: 14,
                borderRadius: 10,
                border: `1.5px solid ${ssoProvider === p ? "var(--vyne-purple)" : "var(--content-border)"}`,
                background:
                  ssoProvider === p
                    ? "rgba(108,71,255,0.06)"
                    : "var(--content-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {p === "none" ? "Disabled" : p}
            </button>
          ))}
        </div>
        {ssoProvider !== "none" && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 10,
              background: "var(--content-secondary)",
              fontSize: 12,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            ACS URL: https://api.vyne.dev/sso/saml/acs
            <br />
            Entity ID: urn:vyne:demo-org
            <br />
            Metadata: https://api.vyne.dev/sso/saml/metadata.xml
          </div>
        )}
      </SectionCard>

      {/* ── Active sessions ─────────────────────────────────── */}
      <SectionCard
        title="Active sessions"
        subtitle="Devices currently signed in to your account."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sessions.map((s) => {
            const Icon = deviceIcon(s.device);
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: s.current
                    ? "1.5px solid var(--vyne-purple)"
                    : "1px solid var(--content-border)",
                  background: s.current
                    ? "rgba(108,71,255,0.05)"
                    : "var(--content-secondary)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "var(--content-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--vyne-purple)",
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.deviceName}
                    </div>
                    {s.current && (
                      <span
                        style={{
                          padding: "1px 8px",
                          borderRadius: 999,
                          background: "var(--badge-success-bg)",
                          color: "var(--badge-success-text)",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        This device
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Globe size={11} /> {s.location} · {s.ip} · {s.lastActive}
                  </div>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    aria-label={`Revoke session on ${s.deviceName}`}
                    onClick={() => revokeSession(s.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--content-border)",
                      background: "var(--content-bg)",
                      color: "var(--status-danger)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <LogOut size={12} /> Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {sessions.filter((s) => !s.current).length > 0 && (
          <button
            type="button"
            onClick={revokeAllOtherSessions}
            style={{
              marginTop: 14,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--status-danger)",
              background: "transparent",
              color: "var(--status-danger)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <LogOut size={13} /> Sign out of all other sessions
          </button>
        )}
      </SectionCard>

      {/* ── IP allowlist ──────────────────────────────────── */}
      <SectionCard
        title="IP allowlist"
        subtitle="Restrict API + dashboard access to specific IP ranges (Enterprise plan)."
      >
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 10,
          }}
        >
          Add one CIDR range per line. Example: <code>10.0.0.0/8</code>
        </div>
        <textarea
          rows={4}
          placeholder="10.0.0.0/8&#10;203.0.113.0/24"
          aria-label="IP allowlist"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            outline: "none",
            resize: "vertical",
          }}
        />
      </SectionCard>

      <button aria-label="hidden" style={{ display: "none" }}>
        <KeyRound />
      </button>
    </div>
  );
}
