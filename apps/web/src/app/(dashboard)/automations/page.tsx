"use client";

import { useState } from "react";
import { Zap, Plus } from "lucide-react";
import {
  type Automation,
  type AutomationStatus,
  type FilterTab,
  INITIAL_AUTOMATIONS,
  matchesFilter,
  matchesSearch,
} from "@/components/automations/types";
import {
  KpiStrip,
  AutomationsList,
  AutomationDetailPanel,
} from "@/components/automations";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [automations, setAutomations] =
    useState<Automation[]>(INITIAL_AUTOMATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  const selectedAutomation =
    automations.find((a) => a.id === selectedId) ?? null;

  const visibleAutomations = automations.filter(
    (a) => matchesFilter(a, filterTab) && matchesSearch(a, searchQuery),
  );

  const totalRuns = automations.reduce((sum, a) => sum + a.runCount, 0);
  const activeCount = automations.filter((a) => a.status === "active").length;

  // ─ List actions ─

  function handleToggleStatus(id: string) {
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next: AutomationStatus =
          a.status === "active" ? "paused" : "active";
        return { ...a, status: next };
      }),
    );
  }

  function handleNewAutomation() {
    setSelectedId(null);
    setShowTemplateGallery(true);
  }

  function handleSelectAutomation(id: string) {
    setSelectedId(id);
    setShowTemplateGallery(false);
  }

  function handleSelectIdFromPanel(id: string) {
    setSelectedId(id);
    setShowTemplateGallery(false);
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--content-secondary)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 44,
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          gap: 10,
          flexShrink: 0,
          background: "var(--content-bg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(6, 182, 212,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={12} color="#06B6D4" />
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Automations
          </span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {activeCount} active · {automations.length} total
          </span>
          <button
            onClick={handleNewAutomation}
            style={{
              background: "var(--vyne-purple)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Plus size={12} /> New Automation
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <KpiStrip
        totalAutomations={automations.length}
        activeCount={activeCount}
        totalRuns={totalRuns}
      />

      {/* Split view */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left sidebar */}
        <AutomationsList
          automations={visibleAutomations}
          allAutomations={automations}
          selectedId={selectedId}
          filterTab={filterTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterChange={setFilterTab}
          onSelect={handleSelectAutomation}
          onToggle={handleToggleStatus}
        />

        {/* Right panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--table-header-bg)",
          }}
        >
          <AutomationDetailPanel
            automation={selectedAutomation}
            showTemplateGallery={showTemplateGallery}
            automations={automations}
            onSetAutomations={setAutomations}
            onSelectId={handleSelectIdFromPanel}
            onCloseGallery={() => setShowTemplateGallery(false)}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </div>
    </div>
  );
}
