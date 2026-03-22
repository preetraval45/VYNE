"use client";

import { useCallback } from "react";
import { useSettingsStore } from "@/lib/stores/settings";
import type { NotificationSettings as NotifType } from "@/lib/stores/settings";

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
        aria-checked={checked}
        onClick={onChange}
        onKeyDown={(e) => e.key === " " && onChange()}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? "#6C47FF" : "#D8D8E8",
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
            background: "#fff",
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            transition: "left 0.2s",
          }}
        />
      </button>
      {label && <span style={{ fontSize: 12, color: "#1A1A2E" }}>{label}</span>}
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
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E" }}>
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
                  style={{ fontSize: 13, fontWeight: 500, color: "#1A1A2E" }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 11, color: "#A0A0B8", marginTop: 1 }}>
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

      <SectionCard title="Email Digest">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A2E" }}>
              Digest frequency
            </div>
            <div style={{ fontSize: 11, color: "#A0A0B8", marginTop: 1 }}>
              Receive a summary email of recent activity
            </div>
          </div>
          <select
            value={notif.emailDigest}
            onChange={(e) =>
              setDigest(e.target.value as "daily" | "weekly" | "never")
            }
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #D8D8E8",
              background: "#FAFAFE",
              fontSize: 13,
              color: "#1A1A2E",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="never">Never</option>
          </select>
        </div>
      </SectionCard>
    </div>
  );
}
