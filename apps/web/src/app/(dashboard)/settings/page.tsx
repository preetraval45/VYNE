"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Settings,
  Users,
  Package,
  Bell,
  DollarSign,
  Code,
  Shield,
  FileClock,
  Zap,
  FormInput,
  Plug,
  ScrollText,
  Sparkles,
  BarChart3,
  Smartphone,
  Search,
  Database,
  Radio,
  Cpu,
  Inbox,
  Workflow,
} from "lucide-react";
import { useRegisterCommands } from "@/hooks/useRegisterCommands";

// Settings page was a 228KB single chunk because it imported all 15 panels
// eagerly. Each panel is its own tab — the user sees exactly one at a time —
// so every panel lazy-loads its own chunk on first selection.
const panelLoading = () => (
  <div
    style={{
      padding: 40,
      textAlign: "center",
      color: "var(--text-tertiary)",
      fontSize: 13,
    }}
  >
    Loading…
  </div>
);
const lazyPanel = (
  loader: () => Promise<{
    default: React.ComponentType<{ onToast: (msg: string) => void }>;
  }>,
) => dynamic(loader, { ssr: false, loading: panelLoading });

const GeneralSettings = lazyPanel(
  () => import("@/components/settings/GeneralSettings"),
);
const MembersSettings = lazyPanel(
  () => import("@/components/settings/MembersSettings"),
);
const NotificationsSettings = lazyPanel(
  () => import("@/components/settings/NotificationsSettings"),
);
const ErpSettings = lazyPanel(
  () => import("@/components/settings/ErpSettings"),
);
const BillingSettings = lazyPanel(
  () => import("@/components/settings/BillingSettings"),
);
const DeveloperSettings = lazyPanel(
  () => import("@/components/settings/DeveloperSettings"),
);
const SecuritySettings = lazyPanel(
  () => import("@/components/settings/SecuritySettings"),
);
const AuditSettings = lazyPanel(
  () => import("@/components/settings/AuditSettings"),
);
const SnippetsSettings = lazyPanel(
  () => import("@/components/settings/SnippetsSettings"),
);
const FormsSettings = lazyPanel(
  () => import("@/components/settings/FormsSettings"),
);
const IntegrationsSettings = lazyPanel(
  () => import("@/components/settings/IntegrationsSettings"),
);
const ComplianceSettings = lazyPanel(
  () => import("@/components/settings/ComplianceSettings"),
);
const GrowthSettings = lazyPanel(
  () => import("@/components/settings/GrowthSettings"),
);
const AnalyticsSettings = lazyPanel(
  () => import("@/components/settings/AnalyticsSettings"),
);
// SearchAnalyticsPanel doesn't need onToast — load it directly with `dynamic`
// rather than the toast-typed `lazyPanel` helper.
const SearchAnalyticsPanel = dynamic(
  () => import("@/components/settings/SearchAnalyticsPanel"),
  { ssr: false, loading: panelLoading },
);
const MobileSettings = lazyPanel(
  () => import("@/components/settings/MobileSettings"),
);
const AiPreferencesSettings = lazyPanel(
  () => import("@/components/settings/AiPreferencesSettings"),
);
// RagDocumentsSettings doesn't take onToast — use react-hot-toast directly.
const RagDocumentsSettings = dynamic(
  () =>
    import("@/components/settings/RagDocumentsSettings").then(
      (m) => m.RagDocumentsSettings,
    ),
  { ssr: false, loading: panelLoading },
);
// RealtimeStatusCard — same pattern, no onToast.
const RealtimeStatusCard = dynamic(
  () =>
    import("@/components/settings/RealtimeStatusCard").then(
      (m) => m.RealtimeStatusCard,
    ),
  { ssr: false, loading: panelLoading },
);
// ComputerUseSidebar — UI_UPGRADE_PLAN.md 5.5.
const ComputerUseSidebar = dynamic(
  () =>
    import("@/components/ai/ComputerUseSidebar").then(
      (m) => m.ComputerUseSidebar,
    ),
  { ssr: false, loading: panelLoading },
);
// StaleChannelsPanel — UI_UPGRADE_PLAN.md 6.5.
const StaleChannelsPanel = dynamic(
  () =>
    import("@/components/settings/StaleChannelsPanel").then(
      (m) => m.StaleChannelsPanel,
    ),
  { ssr: false, loading: panelLoading },
);
// ChatWorkflowsPanel — UI_UPGRADE_PLAN.md 6.3.
const ChatWorkflowsPanel = dynamic(
  () =>
    import("@/components/settings/ChatWorkflowsPanel").then(
      (m) => m.ChatWorkflowsPanel,
    ),
  { ssr: false, loading: panelLoading },
);
// FieldPermissionsEditor — UI_UPGRADE_PLAN.md 7.3.
const FieldPermissionsEditor = dynamic(
  () =>
    import("@/components/settings/FieldPermissionsEditor").then(
      (m) => m.FieldPermissionsEditor,
    ),
  { ssr: false, loading: panelLoading },
);
const DataLifecycleSettings = lazyPanel(
  () => import("@/components/settings/DataLifecycleSettings"),
);
const TrashSettings = lazyPanel(
  () => import("@/components/settings/TrashSettings"),
);
const AccessibilitySettings = lazyPanel(
  () => import("@/components/settings/AccessibilitySettings"),
);

// ─── Tab config ──────────────────────────────────────────────────
const TABS = [
  { id: "general", label: "General", icon: <Settings size={14} /> },
  { id: "members", label: "Members", icon: <Users size={14} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={14} /> },
  { id: "snippets", label: "Snippets", icon: <Zap size={14} /> },
  { id: "forms", label: "Forms", icon: <FormInput size={14} /> },
  { id: "erp", label: "ERP Config", icon: <Package size={14} /> },
  { id: "billing", label: "Billing", icon: <DollarSign size={14} /> },
  { id: "integrations", label: "Integrations", icon: <Plug size={14} /> },
  { id: "growth", label: "Growth", icon: <Sparkles size={14} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={14} /> },
  { id: "search-analytics", label: "Search analytics", icon: <Search size={14} /> },
  { id: "ai-preferences", label: "AI preferences", icon: <Sparkles size={14} /> },
  { id: "rag-documents", label: "RAG documents", icon: <Database size={14} /> },
  { id: "realtime", label: "Realtime", icon: <Radio size={14} /> },
  { id: "computer-use", label: "Computer use", icon: <Cpu size={14} /> },
  { id: "stale-channels", label: "Stale channels", icon: <Inbox size={14} /> },
  { id: "chat-workflows", label: "Chat workflows", icon: <Workflow size={14} /> },
  { id: "field-permissions", label: "Field permissions", icon: <Shield size={14} /> },
  { id: "data", label: "Data & backups", icon: <Package size={14} /> },
  { id: "trash", label: "Trash", icon: <Code size={14} /> },
  { id: "accessibility", label: "Accessibility & language", icon: <Shield size={14} /> },
  { id: "mobile", label: "Mobile", icon: <Smartphone size={14} /> },
  { id: "security", label: "Security", icon: <Shield size={14} /> },
  { id: "compliance", label: "Compliance", icon: <ScrollText size={14} /> },
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
        background: "var(--text-primary)",
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

  useRegisterCommands(
    "settings",
    TABS.map((t) => ({
      id: `settings-${t.id}`,
      label: `Settings: ${t.label}`,
      icon: t.icon,
      action: () => setTab(t.id),
    })),
  );

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
              background: tab === id ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)" : "transparent",
              color: tab === id ? "var(--vyne-accent, #06B6D4)" : "var(--text-secondary)",
              fontWeight: tab === id ? 500 : 400,
              marginBottom: 2,
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              if (tab !== id)
                (e.currentTarget as HTMLElement).style.background =
                  "var(--content-secondary)";
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
        {tab === "integrations" && <IntegrationsSettings onToast={showToast} />}
        {tab === "compliance" && <ComplianceSettings onToast={showToast} />}
        {tab === "growth" && <GrowthSettings onToast={showToast} />}
        {tab === "analytics" && <AnalyticsSettings onToast={showToast} />}
        {tab === "search-analytics" && <SearchAnalyticsPanel />}
        {tab === "ai-preferences" && (
          <AiPreferencesSettings onToast={showToast} />
        )}
        {tab === "rag-documents" && <RagDocumentsSettings />}
        {tab === "realtime" && <RealtimeStatusCard />}
        {tab === "computer-use" && <ComputerUseSidebar />}
        {tab === "stale-channels" && <StaleChannelsPanel />}
        {tab === "chat-workflows" && <ChatWorkflowsPanel />}
        {tab === "field-permissions" && <FieldPermissionsEditor />}
        {tab === "data" && <DataLifecycleSettings onToast={showToast} />}
        {tab === "trash" && <TrashSettings onToast={showToast} />}
        {tab === "accessibility" && (
          <AccessibilitySettings onToast={showToast} />
        )}
        {tab === "mobile" && <MobileSettings onToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}
