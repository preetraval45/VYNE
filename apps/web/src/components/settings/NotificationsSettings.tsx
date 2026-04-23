"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Send, Volume2, Play, SpellCheck } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settings";
import { useAuthStore } from "@/lib/stores/auth";
import type { NotificationSettings as NotifType } from "@/lib/stores/settings";

interface DigestPreview {
  headline: string;
  summary: string;
  bullets: string[];
  callToAction: string;
}

// ─── Shared UI ───────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
}: Readonly<{ checked: boolean; onChange: () => void; label?: string }>) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked ? "true" : "false"}
        aria-label={label ?? "Toggle"}
        onClick={onChange}
        onKeyDown={(e) => e.key === " " && onChange()}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? "var(--vyne-purple)" : "var(--content-border)",
          position: "relative",
          cursor: "pointer",
          border: "none",
          padding: 0,
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--content-bg)",
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            transition: "left 0.2s",
          }}
        />
      </button>
      {label && <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{label}</span>}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
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
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────
interface NotificationsSettingsProps {
  readonly onToast: (message: string) => void;
}

// ─── Component ───────────────────────────────────────────────────
export default function NotificationsSettings({
  onToast,
}: NotificationsSettingsProps) {
  const notif = useSettingsStore((s) => s.notificationSettings);
  const update = useSettingsStore((s) => s.updateNotificationSettings);
  const userEmail = useAuthStore((s) => s.user?.email);
  const [sendingTest, setSendingTest] = useState(false);

  // ── AI digest preview state ──────────────────────────────────
  const [aiDigest, setAiDigest] = useState<DigestPreview | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestProvider, setDigestProvider] = useState<string | null>(null);
  const [postChannel, setPostChannel] = useState("#general");

  const generateDigest = useCallback(async () => {
    setDigestLoading(true);
    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: postChannel,
          highlights: [
            "Sprint 12 in flight",
            "47 new orders",
            "AI auto-resolved 2 incidents",
          ],
        }),
      });
      const data = (await res.json()) as {
        digest: DigestPreview;
        provider: string;
      };
      setAiDigest(data.digest);
      setDigestProvider(data.provider);
    } catch {
      onToast("Could not generate digest");
    } finally {
      setDigestLoading(false);
    }
  }, [onToast, postChannel]);

  const postDigestNow = useCallback(() => {
    if (!aiDigest) {
      onToast("Generate the digest preview first");
      return;
    }
    onToast(`Daily digest posted to ${postChannel}`);
  }, [aiDigest, postChannel, onToast]);

  const sendTestEmail = useCallback(async () => {
    if (!userEmail) {
      onToast("No email on file — sign in again to receive test messages");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: userEmail, kind: "test" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        queued?: boolean;
        provider?: string;
        error?: string;
      };
      if (res.ok) {
        onToast(
          data.queued
            ? `Test email queued via ${data.provider}`
            : "Email provider not configured — preferences saved locally",
        );
      } else {
        onToast(data.error ?? "Could not send test email");
      }
    } catch {
      onToast("Could not reach the notifications service");
    } finally {
      setSendingTest(false);
    }
  }, [userEmail, onToast]);

  const toggle = useCallback(
    async (key: keyof NotifType) => {
      const current = notif[key];
      if (typeof current === "boolean") {
        try {
          await update({ [key]: !current });
          onToast(
            `${key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())} ${!current ? "enabled" : "disabled"}`,
          );
        } catch {
          onToast("Failed to update notification setting");
        }
      }
    },
    [notif, update, onToast],
  );

  const setDigest = useCallback(
    async (val: "daily" | "weekly" | "never") => {
      try {
        await update({ emailDigest: val });
        onToast(`Email digest set to ${val}`);
      } catch {
        onToast("Failed to update digest frequency");
      }
    },
    [update, onToast],
  );

  const groups: Array<{
    title: string;
    items: Array<{ key: keyof NotifType; label: string; hint: string }>;
  }> = [
    {
      title: "AI & Incidents",
      items: [
        {
          key: "aiAlerts",
          label: "AI alerts",
          hint: "Get notified when Vyne AI detects anomalies or insights",
        },
        {
          key: "deployAlerts",
          label: "Deployment notifications",
          hint: "Success/failure alerts for deployments",
        },
      ],
    },
    {
      title: "Business",
      items: [
        {
          key: "orderAlerts",
          label: "Order & inventory alerts",
          hint: "Low stock, new orders, status changes",
        },
        {
          key: "mentionAlerts",
          label: "@Mention notifications",
          hint: "When someone mentions you in chat or comments",
        },
      ],
    },
    {
      title: "Delivery Channels",
      items: [
        {
          key: "emailEnabled",
          label: "Email notifications",
          hint: "Receive alerts via email (@mentions, assignments, alerts)",
        },
        {
          key: "pushEnabled",
          label: "Push notifications",
          hint: "Browser or mobile push notifications",
        },
      ],
    },
  ];

  return (
    <div>
      {groups.map(({ title, items }) => (
        <SectionCard key={title} title={title}>
          {items.map(({ key, label, hint }) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                  {hint}
                </div>
              </div>
              <Toggle
                checked={notif[key] as boolean}
                onChange={() => toggle(key)}
              />
            </div>
          ))}
        </SectionCard>
      ))}

      <SectionCard title="AI daily digest">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Auto-post a daily digest
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 1,
                }}
              >
                Vyne AI summarises the previous 24h across all modules and posts to the channel below.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={postChannel}
                onChange={(e) => setPostChannel(e.target.value)}
                aria-label="Channel to post digest in"
                placeholder="#general"
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  width: 140,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={generateDigest}
                disabled={digestLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--vyne-purple)",
                  background: "transparent",
                  color: "var(--vyne-purple)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: digestLoading ? "default" : "pointer",
                  opacity: digestLoading ? 0.6 : 1,
                }}
              >
                <Sparkles size={12} />
                {digestLoading ? "Generating…" : "Preview"}
              </button>
              <button
                type="button"
                onClick={postDigestNow}
                disabled={!aiDigest}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: aiDigest
                    ? "var(--vyne-purple)"
                    : "var(--content-border)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: aiDigest ? "pointer" : "default",
                }}
              >
                <Send size={12} />
                Post now
              </button>
            </div>
          </div>

          {aiDigest && (
            <article
              style={{
                padding: 14,
                borderRadius: 10,
                background: "var(--alert-purple-bg)",
                border: "1px solid var(--alert-purple-border)",
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Sparkles size={13} style={{ color: "var(--vyne-purple)" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--vyne-purple)",
                  }}
                >
                  Preview
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    marginLeft: "auto",
                  }}
                >
                  Generated by {digestProvider === "claude" ? "Claude" : "demo fallback"}
                </span>
              </header>
              <h4
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {aiDigest.headline}
              </h4>
              <p
                style={{
                  margin: "4px 0 10px",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {aiDigest.summary}
              </p>
              <ul
                style={{
                  margin: "0 0 10px",
                  paddingLeft: 18,
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.7,
                }}
              >
                {aiDigest.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p
                style={{
                  margin: 0,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(6, 182, 212,0.1)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--vyne-purple)",
                }}
              >
                ⚡ {aiDigest.callToAction}
              </p>
            </article>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Do not disturb">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                Enable quiet hours
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                Silence push + @mention notifications on a schedule
              </div>
            </div>
            <Toggle
              checked={notif.dndEnabled}
              onChange={() => toggle("dndEnabled")}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              opacity: notif.dndEnabled ? 1 : 0.5,
              pointerEvents: notif.dndEnabled ? "auto" : "none",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Start
              </span>
              <input
                type="time"
                value={notif.dndStart}
                onChange={(e) => update({ dndStart: e.target.value })}
                aria-label="Quiet hours start"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                End
              </span>
              <input
                type="time"
                value={notif.dndEnd}
                onChange={(e) => update({ dndEnd: e.target.value })}
                aria-label="Quiet hours end"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </label>
          </div>

          <div
            style={{
              opacity: notif.dndEnabled ? 1 : 0.5,
              pointerEvents: notif.dndEnabled ? "auto" : "none",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Active days
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
                const active = notif.dndDays.includes(i);
                return (
                  <button
                    key={`dnd-day-${i}`}
                    type="button"
                    aria-pressed={active ? "true" : "false"}
                    aria-label={`${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][i]} ${active ? "on" : "off"}`}
                    onClick={() => {
                      const next = active
                        ? notif.dndDays.filter((x) => x !== i)
                        : [...notif.dndDays, i].sort((a, b) => a - b);
                      update({ dndDays: next });
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      border: `1.5px solid ${active ? "var(--vyne-purple)" : "var(--content-border)"}`,
                      background: active ? "rgba(6, 182, 212,0.1)" : "var(--content-bg)",
                      color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Email Digest">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
              Digest frequency
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
              Receive a summary email of recent activity
            </div>
          </div>
          <select aria-label="Select option"
            value={notif.emailDigest}
            onChange={(e) =>
              setDigest(e.target.value as "daily" | "weekly" | "never")
            }
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "var(--content-secondary)",
              fontSize: 13,
              color: "var(--text-primary)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="never">Never</option>
          </select>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--content-border)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
              Send test email
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
              Verify delivery to {userEmail ?? "your email"}
            </div>
          </div>
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={sendingTest || !userEmail}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--vyne-purple)",
              background: "transparent",
              color: "var(--vyne-purple)",
              fontSize: 12,
              fontWeight: 600,
              cursor: sendingTest || !userEmail ? "default" : "pointer",
              opacity: sendingTest || !userEmail ? 0.6 : 1,
            }}
          >
            {sendingTest ? "Sending…" : "Send test"}
          </button>
        </div>
      </SectionCard>

      <ChannelSoundsCard onToast={onToast} />

      <WritingAssistCard onToast={onToast} />
    </div>
  );
}

// ─── Per-channel notification sounds ─────────────────────────
const SOUND_KEY = "vyne-channel-sounds";
const SOUNDS: Array<{ id: string; label: string; freq: number; dur: number }> = [
  { id: "none", label: "Silent", freq: 0, dur: 0 },
  { id: "chime", label: "Chime", freq: 880, dur: 0.15 },
  { id: "ping", label: "Ping", freq: 1320, dur: 0.08 },
  { id: "pop", label: "Pop", freq: 440, dur: 0.05 },
  { id: "knock", label: "Knock", freq: 220, dur: 0.12 },
  { id: "bell", label: "Bell", freq: 1600, dur: 0.25 },
];
const CHANNELS = [
  "#general",
  "#engineering",
  "#ops-alerts",
  "#sales-wins",
  "Direct messages",
  "@mentions",
];

function ChannelSoundsCard({
  onToast,
}: Readonly<{ onToast: (m: string) => void }>) {
  const [map, setMap] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    CHANNELS.forEach((c) => (init[c] = c === "@mentions" ? "bell" : "chime"));
    return init;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      if (raw) setMap((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SOUND_KEY, JSON.stringify(map));
    } catch {}
  }, [map]);

  function preview(id: string) {
    const s = SOUNDS.find((x) => x.id === id);
    if (!s || s.id === "none") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = s.freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + s.dur);
    } catch {
      onToast("Audio preview not supported in this browser");
    }
  }

  return (
    <SectionCard title="Per-channel notification sounds">
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
        }}
      >
        Tune the sound each channel plays. Use <em>Bell</em> for high-priority
        channels and <em>Silent</em> for anything noisy.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CHANNELS.map((ch) => (
          <div
            key={ch}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
            }}
          >
            <Volume2 size={13} style={{ color: "var(--vyne-purple)" }} />
            <span
              style={{
                flex: 1,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily:
                  "var(--font-geist-mono), ui-monospace, monospace",
              }}
            >
              {ch}
            </span>
            <select
              value={map[ch] ?? "chime"}
              onChange={(e) =>
                setMap((prev) => ({ ...prev, [ch]: e.target.value }))
              }
              aria-label={`${ch} sound`}
              style={{
                padding: "5px 8px",
                borderRadius: 6,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => preview(map[ch] ?? "chime")}
              aria-label={`Preview ${ch} sound`}
              style={{
                width: 28,
                height: 28,
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
              <Play size={11} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Writing assistance (spell/grammar) ─────────────────────
const WRITE_KEY = "vyne-writing-assist";

interface WritingPrefs {
  spellCheck: boolean;
  grammarCheck: boolean;
  aiRewrite: boolean;
  language: string;
}

function WritingAssistCard({
  onToast,
}: Readonly<{ onToast: (m: string) => void }>) {
  const [prefs, setPrefs] = useState<WritingPrefs>({
    spellCheck: true,
    grammarCheck: true,
    aiRewrite: false,
    language: "en-US",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(WRITE_KEY);
      if (raw) setPrefs((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(WRITE_KEY, JSON.stringify(prefs));
      document.documentElement.lang = prefs.language;
      document.documentElement.setAttribute(
        "data-spellcheck",
        prefs.spellCheck ? "on" : "off",
      );
    } catch {}
  }, [prefs]);

  function set<K extends keyof WritingPrefs>(key: K, value: WritingPrefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
    onToast(`${String(key)} updated`);
  }

  return (
    <SectionCard title="Smart writing assistance">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SpellCheck
                size={13}
                style={{ color: "var(--vyne-purple)" }}
              />
              Spell check in docs + chat
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 1,
              }}
            >
              Red squiggles under misspellings as you type.
            </div>
          </div>
          <Toggle
            checked={prefs.spellCheck}
            onChange={() => set("spellCheck", !prefs.spellCheck)}
            label="Spell check"
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Grammar check
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 1,
              }}
            >
              Flags run-on sentences, passive voice, and agreement errors.
            </div>
          </div>
          <Toggle
            checked={prefs.grammarCheck}
            onChange={() => set("grammarCheck", !prefs.grammarCheck)}
            label="Grammar check"
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              AI rewrite suggestions
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 1,
              }}
            >
              Suggest clearer phrasing via ⌘J while composing.
            </div>
          </div>
          <Toggle
            checked={prefs.aiRewrite}
            onChange={() => set("aiRewrite", !prefs.aiRewrite)}
            label="AI rewrite"
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Language
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 1,
              }}
            >
              Dictionary + grammar rules applied.
            </div>
          </div>
          <select
            value={prefs.language}
            onChange={(e) => set("language", e.target.value)}
            aria-label="Language"
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Español</option>
            <option value="fr-FR">Français</option>
            <option value="de-DE">Deutsch</option>
            <option value="pt-BR">Português (BR)</option>
            <option value="ja-JP">日本語</option>
          </select>
        </div>
      </div>
    </SectionCard>
  );
}
