"use client";

// PH-D D3 — Real MFA UI for Settings → Security.
//
// Replaces the previous client-only 2FA mockup. Drives the four MFA
// backend routes:
//   - POST /api/auth/mfa/setup     → secret + QR (NOT persisted yet)
//   - POST /api/auth/mfa/confirm   → verify first code + recovery codes
//   - POST /api/auth/mfa/disable   → requires password + valid code
//   - GET  /api/auth/session       → tells us whether MFA is already on
//
// Recovery codes are shown ONCE after enablement, on a confirmation
// screen the user must explicitly dismiss. Same UX as Google /
// 1Password's "you'll only see these once" prompt.

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  KeyRound,
} from "lucide-react";

type Phase =
  | "loading"
  | "idle-on"
  | "idle-off"
  | "setup-scan"
  | "setup-recovery"
  | "disable";

interface SetupPayload {
  secret: string;
  otpauthUrl: string;
  qrImageUrl: string;
}

interface Props {
  readonly onToast: (message: string) => void;
}

export function MfaPanel({ onToast }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Setup state — only populated during the enrollment flow.
  const [setupPayload, setSetupPayload] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");

  // Recovery codes shown once after confirmation.
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Disable flow — both password AND a code required.
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  // Bootstrap — figure out whether MFA is currently enabled by reading
  // the session endpoint. /api/auth/session returns the authenticated
  // user including `mfaEnabled`.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as {
          user?: { mfaEnabled?: boolean };
        };
        if (cancelled) return;
        setPhase(body.user?.mfaEnabled ? "idle-on" : "idle-off");
      } catch {
        if (!cancelled) setPhase("idle-off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSetup = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        secret?: string;
        otpauthUrl?: string;
        qrImageUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.secret || !body.otpauthUrl || !body.qrImageUrl) {
        setError(body.error ?? "Couldn't start MFA setup.");
        return;
      }
      setSetupPayload({
        secret: body.secret,
        otpauthUrl: body.otpauthUrl,
        qrImageUrl: body.qrImageUrl,
      });
      setCode("");
      setPhase("setup-scan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmSetup = useCallback(async () => {
    if (!setupPayload) return;
    if (code.replace(/\s/g, "").length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: setupPayload.secret,
          code: code.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        recoveryCodes?: string[];
      };
      if (!res.ok || !body.ok || !body.recoveryCodes) {
        setError(body.error ?? "Couldn't enable MFA.");
        return;
      }
      setRecoveryCodes(body.recoveryCodes);
      setPhase("setup-recovery");
      onToast("Two-factor authentication enabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }, [setupPayload, code, onToast]);

  const finishRecovery = useCallback(() => {
    setRecoveryCodes(null);
    setSetupPayload(null);
    setCode("");
    setPhase("idle-on");
  }, []);

  const startDisable = useCallback(() => {
    setError(null);
    setDisablePassword("");
    setDisableCode("");
    setPhase("disable");
  }, []);

  const confirmDisable = useCallback(async () => {
    if (!disablePassword || !disableCode) {
      setError("Password and code both required.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Couldn't disable MFA.");
        return;
      }
      setDisablePassword("");
      setDisableCode("");
      onToast("Two-factor authentication disabled");
      setPhase("idle-off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }, [disablePassword, disableCode, onToast]);

  /* ─── Render ─── */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {phase === "loading" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          <Loader2 size={14} className="animate-spin" /> Checking your MFA
          status…
        </div>
      )}

      {phase === "idle-on" && <IdleRow enabled onClick={startDisable} />}
      {phase === "idle-off" && (
        <IdleRow enabled={false} onClick={startSetup} loading={isLoading} />
      )}

      {phase === "setup-scan" && setupPayload && (
        <SetupScan
          payload={setupPayload}
          code={code}
          setCode={setCode}
          onConfirm={confirmSetup}
          isLoading={isLoading}
          onCancel={() => {
            setSetupPayload(null);
            setCode("");
            setError(null);
            setPhase("idle-off");
          }}
          onCopySecret={() => {
            void navigator.clipboard?.writeText(setupPayload.secret).then(
              () => onToast("Secret copied"),
              () => {},
            );
          }}
        />
      )}

      {phase === "setup-recovery" && recoveryCodes && (
        <RecoveryCodes
          codes={recoveryCodes}
          onDone={finishRecovery}
          onToast={onToast}
        />
      )}

      {phase === "disable" && (
        <DisableForm
          password={disablePassword}
          setPassword={setDisablePassword}
          code={disableCode}
          setCode={setDisableCode}
          onConfirm={confirmDisable}
          onCancel={() => {
            setDisablePassword("");
            setDisableCode("");
            setError(null);
            setPhase("idle-on");
          }}
          isLoading={isLoading}
        />
      )}

      {error && (
        <div
          role="alert"
          style={{
            display: "inline-flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 12px",
            background: "var(--badge-warning-bg, #FFFBEB)",
            border: "1px solid rgba(217,119,6,0.25)",
            borderRadius: 8,
            color: "var(--badge-warning-text, #92400E)",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components (private to this file) ──────────────────────── */

function IdleRow({
  enabled,
  onClick,
  loading,
}: {
  readonly enabled: boolean;
  readonly onClick: () => void;
  readonly loading?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: enabled
            ? "var(--badge-success-bg, #F0FDF4)"
            : "var(--content-secondary)",
          color: enabled
            ? "var(--badge-success-text, #166534)"
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
          {enabled ? "MFA is enabled" : "MFA is disabled"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {enabled
            ? "Your account is protected by a time-based one-time code."
            : "Strongly recommended for any account that holds business data."}
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        style={{
          padding: "7px 14px",
          borderRadius: 8,
          border: enabled ? "1px solid var(--status-danger, #DC2626)" : "none",
          background: enabled
            ? "transparent"
            : "var(--vyne-accent, var(--vyne-purple))",
          color: enabled ? "var(--status-danger, #DC2626)" : "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {loading && <Loader2 size={12} className="animate-spin" />}
        {enabled ? "Disable" : "Enable MFA"}
      </button>
    </div>
  );
}

function SetupScan({
  payload,
  code,
  setCode,
  onConfirm,
  onCancel,
  onCopySecret,
  isLoading,
}: {
  readonly payload: SetupPayload;
  readonly code: string;
  readonly setCode: (v: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onCopySecret: () => void;
  readonly isLoading: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        Open your authenticator app (Google Authenticator, 1Password, Authy,
        etc.), scan the QR code, then enter the 6-digit code below.
      </p>

      <div
        style={{
          display: "flex",
          gap: 18,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <img
          src={payload.qrImageUrl}
          alt="MFA setup QR code"
          width={180}
          height={180}
          style={{
            background: "#fff",
            padding: 8,
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            display: "block",
          }}
        />

        <div
          style={{
            flex: 1,
            minWidth: 240,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginBottom: 4,
              }}
            >
              Can't scan? Enter this secret manually:
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                borderRadius: 8,
                fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                fontSize: 12.5,
                color: "var(--text-primary)",
                wordBreak: "break-all",
              }}
            >
              <KeyRound size={12} style={{ flexShrink: 0 }} />
              <span>{payload.secret}</span>
              <button
                type="button"
                onClick={onCopySecret}
                aria-label="Copy MFA secret"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <Copy size={12} />
              </button>
            </div>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              6-digit code
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123 456"
              maxLength={9}
              autoFocus
              style={{
                width: 160,
                padding: "9px 12px",
                fontSize: 16,
                fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
                letterSpacing: "0.15em",
                border: "1px solid var(--content-border)",
                borderRadius: 8,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || code.replace(/\s/g, "").length < 6}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: isLoading ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isLoading && <Loader2 size={12} className="animate-spin" />}
              Confirm + enable
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecoveryCodes({
  codes,
  onDone,
  onToast,
}: {
  readonly codes: string[];
  readonly onDone: () => void;
  readonly onToast: (message: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "12px 14px",
          background: "var(--badge-warning-bg, #FFFBEB)",
          border: "1px solid rgba(217,119,6,0.25)",
          borderRadius: 8,
          color: "var(--badge-warning-text, #92400E)",
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
      >
        <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <strong>Save these recovery codes now.</strong> Each one can be used
          once if you lose access to your authenticator. We can't show them
          again — closing this panel discards them.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 8,
        }}
      >
        {codes.map((c) => (
          <code
            key={c}
            style={{
              padding: "10px 12px",
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              borderRadius: 8,
              fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
              fontSize: 13,
              color: "var(--text-primary)",
              textAlign: "center",
              letterSpacing: "0.05em",
            }}
          >
            {c}
          </code>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(codes.join("\n")).then(
              () => onToast("Codes copied"),
              () => {},
            );
          }}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Copy size={12} />
          Copy all
        </button>
        <button
          type="button"
          onClick={onDone}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CheckCircle2 size={12} />
          I've saved them
        </button>
      </div>
    </div>
  );
}

function DisableForm({
  password,
  setPassword,
  code,
  setCode,
  onConfirm,
  onCancel,
  isLoading,
}: {
  readonly password: string;
  readonly setPassword: (v: string) => void;
  readonly code: string;
  readonly setCode: (v: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly isLoading: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        Disabling MFA requires both your current password AND a valid
        authenticator code (or recovery code).
      </p>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{
            padding: "8px 12px",
            fontSize: 13,
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            background: "var(--content-bg)",
            color: "var(--text-primary)",
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Authentication code or recovery code
        </span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123 456  or  abcd-efgh-ij"
          autoComplete="one-time-code"
          style={{
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: "ui-monospace,'SF Mono',Menlo,monospace",
            letterSpacing: "0.05em",
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            background: "var(--content-bg)",
            color: "var(--text-primary)",
          }}
        />
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading || !password || !code}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid var(--status-danger, #DC2626)",
            background: "var(--status-danger, #DC2626)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: isLoading ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isLoading && <Loader2 size={12} className="animate-spin" />}
          Disable MFA
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
