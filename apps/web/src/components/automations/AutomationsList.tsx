import { Search } from "lucide-react";
import { type Automation, type FilterTab } from "./types";
import AutomationRow from "./AutomationRow";

export default function AutomationsList(
  props: Readonly<{
    automations: Automation[];
    allAutomations: Automation[];
    selectedId: string | null;
    filterTab: FilterTab;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onFilterChange: (tab: FilterTab) => void;
    onSelect: (id: string) => void;
    onToggle: (id: string) => void;
  }>,
) {
  const {
    automations,
    allAutomations,
    selectedId,
    filterTab,
    searchQuery,
    onSearchChange,
    onFilterChange,
    onSelect,
    onToggle,
  } = props;

  const filterTabs: Array<{ key: FilterTab; label: string }> = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "paused", label: "Paused" },
    { key: "draft", label: "Draft" },
  ];

  return (
    <div
      style={{
        width: 280,
        borderRight: "1px solid var(--content-border)",
        display: "flex",
        flexDirection: "column",
        background: "var(--content-secondary)",
        flexShrink: 0,
      }}
    >
      {/* Search */}
      <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 9,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          />
          <label htmlFor="automation-search" style={{ display: "none" }}>
            Search automations
          </label>
          <input
            id="automation-search"
            type="text"
            placeholder="Search automations\u2026"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 9px 7px 28px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              fontSize: 11,
              color: "var(--text-primary)",
              background: "var(--content-bg)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          padding: "0 12px 8px",
          gap: 4,
          flexShrink: 0,
        }}
      >
        {filterTabs.map((tab) => {
          const count =
            tab.key === "all"
              ? allAutomations.length
              : allAutomations.filter((a) => a.status === tab.key).length;
          const isActive = filterTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              style={{
                flex: 1,
                background: isActive ? "#06B6D4" : "transparent",
                color: isActive ? "#fff" : "#6B6B8A",
                border: isActive
                  ? "1px solid #06B6D4"
                  : "1px solid var(--content-border)",
                borderRadius: 6,
                padding: "4px 4px",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.1s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <span>{tab.label}</span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}
        className="content-scroll"
      >
        {automations.length === 0 && (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 11,
            }}
          >
            No automations found
          </div>
        )}
        {automations.map((auto) => (
          <AutomationRow
            key={auto.id}
            automation={auto}
            isSelected={auto.id === selectedId}
            onSelect={() => onSelect(auto.id)}
            onToggle={() => onToggle(auto.id)}
          />
        ))}
      </div>
    </div>
  );
}
