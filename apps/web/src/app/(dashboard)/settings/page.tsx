"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Settings, Users, Package, Bell, DollarSign, Code, Shield, FileClock, Zap, FormInput } from "lucide-react";
import GeneralSettings from "@/components/settings/GeneralSettings";
import MembersSettings from "@/components/settings/MembersSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";
import ErpSettings from "@/components/settings/ErpSettings";
import BillingSettings from "@/components/settings/BillingSettings";
import DeveloperSettings from "@/components/settings/DeveloperSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import AuditSettings from "@/components/settings/AuditSettings";
import SnippetsSettings from "@/components/settings/SnippetsSettings";
import FormsSettings from "@/components/settings/FormsSettings";

// ─── Tab config ──────────────────────────────────────────────────
const TABS = [
  { id: "general", label: "General", icon: <Settings size={14} /> },
  { id: "members", label: "Members", icon: <Users size={14} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={14} /> },
  { id: "snippets", label: "Snippets", icon: <Zap size={14} /> },
  { id: "forms", label: "Forms", icon: <FormInput size={14} /> },
  { id: "erp", label: "ERP Config", icon: <Package size={14} /> },
  { id: "billing", label: "Billing", icon: <DollarSign size={14} /> },
  { id: "security", label: "Security", icon: <Shield size={14} /> },
  { id: "developer", label: "Developer", icon: <Code size={14} /> },
  { id: "audit", label: "Audit Log", icon: <FileClock size={14} /> },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Toast component ─────────────────────────────────────────────
function Toast({
  message,
  onDone,
}: Readonly<{ message: string; onDone: () => void }>) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 2.5s
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300); // wait for slide-out animation
    }, 2500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        padding: "10px 18px",
        borderRadius: 10,
        background: "#1A1A2E",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        transform: visible ? "translateY(0)" : "translateY(20px)",
        opacity: visible ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("general");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      {/* Side nav */}
      <aside
        style={{
          width: 200,
          minWidth: 200,
          borderRight: "1px solid var(--content-border)",
          background: "var(--content-secondary)",
          padding: "16px 10px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            padding: "0 8px",
            marginBottom: 8,
          }}
        >
          Settings
        </div>

        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              background: tab === id ? "rgba(108,71,255,0.1)" : "transparent",
              color: tab === id ? "#6C47FF" : "#6B6B8A",
              fontWeight: tab === id ? 500 : 400,
              marginBottom: 2,
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              if (tab !== id)
                (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
            }}
            onMouseLeave={(e) => {
              if (tab !== id)
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
            }}
          >
            {icon} {label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: 24 }}
      >
        {tab === "general" && <GeneralSettings onToast={showToast} />}
        {tab === "members" && <MembersSettings onToast={showToast} />}
        {tab === "notifications" && (
          <NotificationsSettings onToast={showToast} />
        )}
        {tab === "erp" && <ErpSettings onToast={showToast} />}
        {tab === "billing" && <BillingSettings onToast={showToast} />}
        {tab === "security" && <SecuritySettings onToast={showToast} />}
        {tab === "developer" && <DeveloperSettings onToast={showToast} />}
        {tab === "audit" && <AuditSettings onToast={showToast} />}
        {tab === "snippets" && <SnippetsSettings onToast={showToast} />}
        {tab === "forms" && <FormsSettings onToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}
