"use client";

import { useEffect, useRef, useState } from "react";
import {
  Smartphone,
  Bell,
  ScanLine,
  Fingerprint,
  WifiOff,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  Camera,
  X,
} from "lucide-react";

interface Props {
  readonly onToast: (message: string) => void;
}

const STORAGE_KEY = "vyne-mobile-settings";

interface MobileState {
  pushTopics: { mentions: boolean; alerts: boolean; orders: boolean; ai: boolean };
  offlineCacheMb: number;
  conflictStrategy: "ours" | "theirs" | "merge";
  homeWidgets: string[];
  lockWidget: string;
}

const DEFAULT: MobileState = {
  pushTopics: { mentions: true, alerts: true, orders: false, ai: false },
  offlineCacheMb: 250,
  conflictStrategy: "merge",
  homeWidgets: ["Open issues", "Active incidents", "MRR"],
  lockWidget: "Today's tasks",
};

const AVAILABLE_WIDGETS = [
  "Open issues",
  "Active incidents",
  "MRR",
  "Stock low",
  "Team presence",
  "Calendar today",
  "AI summary",
];

function load(): MobileState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<MobileState>) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function save(state: MobileState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export default function MobileSettings({ onToast }: Props) {
  const [state, setState] = useState<MobileState>(DEFAULT);

  // Notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  // Biometric (WebAuthn)
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  // QR scan
  const [scannerOpen, setScannerOpen] = useState(false);
  // Offline / SW status
  const [swActive, setSwActive] = useState<"unknown" | "yes" | "no">("unknown");

  useEffect(() => {
    setState(load());

    if (typeof window === "undefined") return;

    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission("unsupported");
    }

    // WebAuthn capability check
    if (
      typeof window.PublicKeyCredential !== "undefined" &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setBiometricSupported(Boolean(available)))
        .catch(() => setBiometricSupported(false));
    }
    try {
      setBiometricEnrolled(localStorage.getItem("vyne-biometric-enrolled") === "1");
    } catch {
      // ignore
    }

    // Service worker presence
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => setSwActive(reg ? "yes" : "no"))
        .catch(() => setSwActive("no"));
    } else {
      setSwActive("no");
    }
  }, []);

  function update<K extends keyof MobileState>(key: K, value: MobileState[K]) {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }

  async function requestPush() {
    if (notifPermission === "unsupported") {
      onToast("This browser doesn't support Web Push");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") {
        // Send a test notification immediately
        new Notification("VYNE", {
          body: "You're subscribed — alerts will land here.",
          icon: "/icon-192.png",
        });
        onToast("Push notifications enabled");
      } else {
        onToast("Push permission denied");
      }
    } catch {
      onToast("Could not request push permission");
    }
  }

  async function enrollBiometric() {
    if (!biometricSupported) {
      onToast("Biometric auth isn't supported on this device");
      return;
    }
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "VYNE", id: window.location.hostname },
          user: {
            id: userId,
            name: "demo@vyne.ai",
            displayName: "VYNE demo",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60_000,
          attestation: "none",
        },
      });
      if (cred) {
        try {
          localStorage.setItem("vyne-biometric-enrolled", "1");
        } catch {
          // ignore
        }
        setBiometricEnrolled(true);
        onToast("Biometric credential enrolled");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Enrolment cancelled";
      onToast(msg);
    }
  }

  function unenrollBiometric() {
    try {
      localStorage.removeItem("vyne-biometric-enrolled");
    } catch {
      // ignore
    }
    setBiometricEnrolled(false);
    onToast("Biometric credential removed");
  }

  function toggleHomeWidget(w: string) {
    setState((prev) => {
      const has = prev.homeWidgets.includes(w);
      const next = has
        ? prev.homeWidgets.filter((x) => x !== w)
        : [...prev.homeWidgets, w];
      const updated = { ...prev, homeWidgets: next.slice(0, 4) };
      save(updated);
      return updated;
    });
  }

  return (
    <div>
      {/* ── Mobile push notifications ──────────────────────── */}
      <Card title="Mobile push notifications" icon={Bell}>
        <p style={para}>
          Subscribe this device to push notifications via Web Push (browser) or
          SNS → FCM/APNs (native iOS/Android apps).
        </p>

        <PermissionRow
          label="Browser notification permission"
          state={
            notifPermission === "granted"
              ? "ok"
              : notifPermission === "denied" || notifPermission === "unsupported"
                ? "blocked"
                : "default"
          }
          okLabel="Subscribed"
          actionLabel={
            notifPermission === "granted"
              ? "Send test"
              : notifPermission === "denied"
                ? "Open browser settings"
                : "Enable"
          }
          onAction={() =>
            notifPermission === "granted"
              ? new Notification("VYNE test", {
                  body: "Hello from your workspace.",
                })
              : requestPush()
          }
        />

        <div style={{ marginTop: 14 }}>
          <div style={subhead}>Subscribed topics</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(
              [
                ["mentions", "@mentions"],
                ["alerts", "AI alerts"],
                ["orders", "Order changes"],
                ["ai", "AI insights"],
              ] as const
            ).map(([key, label]) => {
              const on = state.pushTopics[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    update("pushTopics", {
                      ...state.pushTopics,
                      [key]: !on,
                    })
                  }
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    border: `1px solid ${on ? "var(--vyne-purple)" : "var(--content-border)"}`,
                    background: on ? "rgba(108,71,255,0.1)" : "var(--content-bg)",
                    color: on ? "var(--vyne-purple)" : "var(--text-secondary)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {on ? "✓ " : ""}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 9,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            lineHeight: 1.6,
          }}
        >
          # iOS / Android setup<br />
          POST https://api.vyne.dev/v1/push/devices<br />
          {`{ "platform": "apns", "token": "<APNs token>", "topics": ["mentions","alerts"] }`}
        </div>
      </Card>

      {/* ── QR scanner ─────────────────────────────────────── */}
      <Card title="QR scanner for inventory" icon={ScanLine}>
        <p style={para}>
          Scan SKU barcodes from the camera to look up stock, log a count, or
          confirm a pick. Uses the device&apos;s camera + the browser&apos;s
          Barcode Detection API.
        </p>
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-purple)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Camera size={14} />
          Open scanner
        </button>
        {scannerOpen && (
          <QrScannerModal
            onClose={() => setScannerOpen(false)}
            onScan={(value) => {
              setScannerOpen(false);
              onToast(`Scanned: ${value}`);
            }}
          />
        )}
      </Card>

      {/* ── Biometric auth ─────────────────────────────────── */}
      <Card title="Biometric authentication" icon={Fingerprint}>
        <p style={para}>
          Use Touch ID, Face ID, or Windows Hello as a second factor for sign-in
          and high-risk actions. Powered by WebAuthn — no passwords stored
          server-side.
        </p>
        <PermissionRow
          label={
            biometricSupported
              ? "Platform authenticator detected"
              : "No platform authenticator on this device"
          }
          state={
            !biometricSupported
              ? "blocked"
              : biometricEnrolled
                ? "ok"
                : "default"
          }
          okLabel="Enrolled"
          actionLabel={
            !biometricSupported
              ? "Unsupported"
              : biometricEnrolled
                ? "Remove"
                : "Enrol biometric"
          }
          onAction={() =>
            !biometricSupported
              ? null
              : biometricEnrolled
                ? unenrollBiometric()
                : enrollBiometric()
          }
        />
      </Card>

      {/* ── Offline-first sync ─────────────────────────────── */}
      <Card title="Offline-first sync" icon={WifiOff}>
        <p style={para}>
          Cache recently-viewed issues, docs, and orders so your team keeps
          working through spotty wifi. Conflicts are reconciled when the
          connection returns.
        </p>
        <PermissionRow
          label="Service worker"
          state={swActive === "yes" ? "ok" : swActive === "no" ? "blocked" : "default"}
          okLabel="Active"
          actionLabel={swActive === "yes" ? "Update" : "Register"}
          onAction={() =>
            onToast(
              swActive === "yes"
                ? "Service worker update queued"
                : "Service worker not yet shipped — coming in v0.10",
            )
          }
        />

        <div style={{ marginTop: 14 }}>
          <div style={subhead}>Cache budget</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <input
              type="range"
              min={50}
              max={1000}
              step={50}
              value={state.offlineCacheMb}
              onChange={(e) => update("offlineCacheMb", Number(e.target.value))}
              aria-label="Cache budget"
              style={{ flex: 1, accentColor: "#6C47FF" }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                minWidth: 80,
                textAlign: "right",
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              }}
            >
              {state.offlineCacheMb} MB
            </span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={subhead}>Conflict resolution</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                ["ours", "Keep mine", "Local wins on conflict"],
                ["theirs", "Keep server's", "Discard local conflicts"],
                ["merge", "Smart merge", "Field-level CRDT merge"],
              ] as const
            ).map(([id, label, hint]) => {
              const active = state.conflictStrategy === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => update("conflictStrategy", id)}
                  title={hint}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: 9,
                    border: `1.5px solid ${active ? "var(--vyne-purple)" : "var(--content-border)"}`,
                    background: active
                      ? "rgba(108,71,255,0.05)"
                      : "var(--content-bg)",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <span>{label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      fontWeight: 400,
                    }}
                  >
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Mobile widgets ─────────────────────────────────── */}
      <Card title="Mobile widgets (iOS / Android)" icon={LayoutGrid}>
        <p style={para}>
          Pin up to 4 metrics to your phone&apos;s home screen. The lock-screen
          slot shows your single most-important number.
        </p>

        <div style={subhead}>Home-screen widgets ({state.homeWidgets.length}/4)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {AVAILABLE_WIDGETS.map((w) => {
            const active = state.homeWidgets.includes(w);
            const disabled = !active && state.homeWidgets.length >= 4;
            return (
              <button
                key={w}
                type="button"
                disabled={disabled}
                onClick={() => toggleHomeWidget(w)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--vyne-purple)" : "var(--content-border)"}`,
                  background: active ? "rgba(108,71,255,0.1)" : "var(--content-bg)",
                  color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {active ? "✓ " : ""}
                {w}
              </button>
            );
          })}
        </div>

        <div style={subhead}>Lock-screen widget</div>
        <select
          value={state.lockWidget}
          onChange={(e) => update("lockWidget", e.target.value)}
          aria-label="Lock-screen widget"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
            minWidth: 220,
          }}
        >
          {AVAILABLE_WIDGETS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 9,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Smartphone size={20} style={{ color: "var(--vyne-purple)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Live preview
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {state.lockWidget} → glance widget
            </div>
          </div>
          <code
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              background: "var(--content-bg)",
              color: "var(--vyne-purple)",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            12 today
          </code>
        </div>
      </Card>
    </div>
  );
}

const para: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.5,
};

const subhead: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};

function PermissionRow({
  label,
  state,
  okLabel,
  actionLabel,
  onAction,
}: {
  label: string;
  state: "ok" | "blocked" | "default";
  okLabel: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const colorMap = {
    ok: { bg: "var(--badge-success-bg)", color: "var(--badge-success-text)", icon: CheckCircle2 },
    blocked: { bg: "var(--badge-danger-bg)", color: "var(--badge-danger-text)", icon: AlertTriangle },
    default: { bg: "var(--content-secondary)", color: "var(--text-secondary)", icon: AlertTriangle },
  };
  const meta = colorMap[state];
  const Icon = meta.icon;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 9,
        background: meta.bg,
        border: `1px solid ${meta.color}40`,
      }}
    >
      <Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {label}
      </span>
      {state === "ok" && (
        <span
          style={{
            padding: "2px 9px",
            borderRadius: 999,
            background: meta.color,
            color: "var(--content-bg)",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {okLabel}
        </span>
      )}
      <button
        type="button"
        onClick={onAction}
        disabled={state === "blocked" && actionLabel === "Unsupported"}
        style={{
          padding: "6px 12px",
          borderRadius: 7,
          border: `1px solid ${meta.color}`,
          background: "var(--content-bg)",
          color: meta.color,
          fontSize: 11,
          fontWeight: 600,
          cursor:
            state === "blocked" && actionLabel === "Unsupported"
              ? "not-allowed"
              : "pointer",
          opacity:
            state === "blocked" && actionLabel === "Unsupported" ? 0.6 : 1,
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ─── QR scanner modal ─────────────────────────────────────────────
function QrScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    let detectorPromise: Promise<unknown> | null = null;

    async function start() {
      try {
        // Capability check
        const win = window as unknown as {
          BarcodeDetector?: {
            new (opts?: { formats?: string[] }): {
              detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
            };
            getSupportedFormats?: () => Promise<string[]>;
          };
        };
        if (!win.BarcodeDetector) {
          setError(
            "BarcodeDetector API not supported. Try Chrome/Edge on Android or desktop.",
          );
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new win.BarcodeDetector({
          formats: ["qr_code", "ean_13", "code_128", "code_39", "upc_a"],
        });
        detectorPromise = Promise.resolve(detector);

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              setScanning(false);
              onScan(codes[0].rawValue);
              return;
            }
          } catch {
            // ignore single-frame failures
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera access denied";
        setError(msg);
      }
    }

    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      void detectorPromise;
    };
  }, [onScan]);

  return (
    <div
      role="dialog"
      aria-label="QR scanner"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
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
          maxWidth: 460,
          background: "var(--content-bg)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Scan barcode / QR
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={13} />
          </button>
        </div>
        <div
          style={{
            background: "#000",
            position: "relative",
            aspectRatio: "4 / 3",
          }}
        >
          {error ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                padding: 20,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                muted
                playsInline
                aria-label="Camera feed"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              {/* Aim reticle */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: "20%",
                  border: "2px solid rgba(108,71,255,0.85)",
                  borderRadius: 18,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                  pointerEvents: "none",
                }}
              />
            </>
          )}
        </div>
        <div
          style={{
            padding: "10px 16px",
            fontSize: 11,
            color: "var(--text-tertiary)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--content-secondary)",
          }}
        >
          {scanning ? "Looking for a code…" : "Got it!"}
        </div>
      </div>
    </div>
  );
}
