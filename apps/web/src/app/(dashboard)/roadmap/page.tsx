"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Columns3, List, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { TimelineView } from "@/components/roadmap/TimelineView";
import { KanbanView } from "@/components/roadmap/KanbanView";
import { ListView } from "@/components/roadmap/ListView";
import { FeatureRequestModal } from "@/components/roadmap/FeatureRequestModal";
import { CompetitorTable } from "@/components/roadmap/CompetitorTable";
import {
  FEATURES,
  ALL_MODULES,
  ALL_STATUSES,
  STATUS_CONFIG,
  MODULE_COLORS,
  type ViewMode,
  type Module,
  type RoadmapStatus,
} from "@/components/roadmap/roadmapData";

// ── View toggle button ──────────────────────────────────────────
function ViewToggleButton({
  active,
  label,
  icon,
  onClick,
}: Readonly<{
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        borderRadius: 8,
        border: "none",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        background: active ? "rgba(108,71,255,0.1)" : "transparent",
        color: active ? "#6C47FF" : "var(--text-secondary, #6B6B8A)",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Filter pill ─────────────────────────────────────────────────
function FilterPill({
  active,
  label,
  color,
  onClick,
}: Readonly<{
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        background: active ? "#6C47FF" : "var(--content-secondary, #F8F8FC)",
        color: active ? "#fff" : "var(--text-secondary, #6B6B8A)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "all 0.15s ease",
      }}
    >
      {color && !active && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </button>
  );
}

// ── Stat card ───────────────────────────────────────────────────
function StatCard({
  label,
  count,
  dotColor,
  bgColor,
  textColor,
}: Readonly<{
  label: string;
  count: number;
  dotColor: string;
  bgColor: string;
  textColor: string;
}>) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "8px 16px",
        borderRadius: 10,
        background: bgColor,
        minWidth: 80,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: textColor }}>
        {count}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: dotColor,
          }}
        />
        <span style={{ fontSize: 10, color: textColor, fontWeight: 500 }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function RoadmapPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("timeline");
  const [moduleFilter, setModuleFilter] = useState<Module | "All">("All");
  const [statusFilter, setStatusFilter] = useState<RoadmapStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);

  // ── Counts ──────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      shipped: FEATURES.filter((f) => f.status === "shipped").length,
      inProgress: FEATURES.filter((f) => f.status === "in-progress").length,
      planned: FEATURES.filter((f) => f.status === "planned").length,
      consideration: FEATURES.filter((f) => f.status === "under-consideration")
        .length,
    }),
    [],
  );

  // ── Filter logic ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return FEATURES.filter((f) => {
      const moduleOk = moduleFilter === "All" || f.module === moduleFilter;
      const statusOk = statusFilter === "all" || f.status === statusFilter;
      const searchLower = search.toLowerCase();
      const searchOk =
        search.length === 0 ||
        f.title.toLowerCase().includes(searchLower) ||
        f.description.toLowerCase().includes(searchLower) ||
        f.module.toLowerCase().includes(searchLower);
      return moduleOk && statusOk && searchOk;
    });
  }, [moduleFilter, statusFilter, search]);

  const handleFeatureRequest = () => {
    setShowRequestModal(false);
    toast.success("Feature request submitted!", {
      style: {
        borderRadius: 10,
        background: "#1A1A2E",
        color: "#fff",
        fontSize: 13,
      },
    });
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--content-bg, #fff)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #6C47FF 0%, #8B5CF6 50%, #7C3AED 100%)",
          padding: "20px 28px 18px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#fff",
                margin: 0,
                letterSpacing: "-0.03em",
              }}
            >
              Product Roadmap
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                margin: "4px 0 0",
              }}
            >
              Track what we are building, what is next, and where VYNE is headed
            </p>
          </div>
          <button
            onClick={() => router.push("/roadmap/request")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
            }}
          >
            <Plus size={14} />
            Request a Feature
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard
            label="Shipped"
            count={counts.shipped}
            dotColor="#22C55E"
            bgColor="rgba(255,255,255,0.15)"
            textColor="#fff"
          />
          <StatCard
            label="In Progress"
            count={counts.inProgress}
            dotColor="#8B5CF6"
            bgColor="rgba(255,255,255,0.15)"
            textColor="#fff"
          />
          <StatCard
            label="Planned"
            count={counts.planned}
            dotColor="#A0A0B8"
            bgColor="rgba(255,255,255,0.15)"
            textColor="#fff"
          />
          <StatCard
            label="Considering"
            count={counts.consideration}
            dotColor="#F59E0B"
            bgColor="rgba(255,255,255,0.15)"
            textColor="#fff"
          />
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 28px",
          borderBottom: "1px solid var(--content-border, #E8E8F0)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {/* View toggles */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "var(--content-secondary, #F8F8FC)",
            borderRadius: 10,
            padding: 3,
          }}
        >
          <ViewToggleButton
            active={view === "timeline"}
            label="Timeline"
            icon={<Calendar size={13} />}
            onClick={() => setView("timeline")}
          />
          <ViewToggleButton
            active={view === "kanban"}
            label="Kanban"
            icon={<Columns3 size={13} />}
            onClick={() => setView("kanban")}
          />
          <ViewToggleButton
            active={view === "list"}
            label="List"
            icon={<List size={13} />}
            onClick={() => setView("list")}
          />
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: "var(--content-border, #E8E8F0)",
          }}
        />

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            color="var(--text-tertiary, #A0A0B8)"
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "6px 12px 6px 30px",
              borderRadius: 8,
              border: "1px solid var(--content-border, #E8E8F0)",
              fontSize: 12,
              outline: "none",
              width: 200,
              background: "var(--content-secondary, #F8F8FC)",
              color: "var(--text-primary, #1A1A2E)",
            }}
          />
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: "var(--content-border, #E8E8F0)",
          }}
        />

        {/* Status filters */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <FilterPill
            active={statusFilter === "all"}
            label="All Status"
            onClick={() => setStatusFilter("all")}
          />
          {ALL_STATUSES.map((s) => (
            <FilterPill
              key={s}
              active={statusFilter === s}
              label={STATUS_CONFIG[s].label}
              color={STATUS_CONFIG[s].dot}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            />
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: "var(--content-border, #E8E8F0)",
          }}
        />

        {/* Module filters */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <FilterPill
            active={moduleFilter === "All"}
            label="All Modules"
            onClick={() => setModuleFilter("All")}
          />
          {ALL_MODULES.map((m) => (
            <FilterPill
              key={m}
              active={moduleFilter === m}
              label={m}
              color={MODULE_COLORS[m]}
              onClick={() => setModuleFilter(moduleFilter === m ? "All" : m)}
            />
          ))}
        </div>
      </div>

      {/* ── Active filter summary ───────────────────────────── */}
      {(moduleFilter !== "All" ||
        statusFilter !== "all" ||
        search.length > 0) && (
        <div
          style={{
            padding: "6px 28px",
            borderBottom: "1px solid var(--content-border, #E8E8F0)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-secondary, #6B6B8A)",
            flexShrink: 0,
          }}
        >
          <span>
            Showing{" "}
            <strong style={{ color: "#6C47FF" }}>{filtered.length}</strong> of{" "}
            {FEATURES.length} features
          </span>
          <button
            onClick={() => {
              setModuleFilter("All");
              setStatusFilter("all");
              setSearch("");
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color: "#6C47FF",
              fontWeight: 500,
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── View content ────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, overflow: "auto" }}>
          {view === "timeline" && <TimelineView features={filtered} />}
          {view === "kanban" && <KanbanView features={filtered} />}
          {view === "list" && <ListView features={filtered} />}

          {/* Competitor table always visible at bottom */}
          <CompetitorTable />
        </div>
      </div>

      {/* ── Feature request modal ───────────────────────────── */}
      <FeatureRequestModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleFeatureRequest}
      />
    </div>
  );
}
