"use client";

import { useMemo, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { Employee } from "@/lib/fixtures/hr";

interface Props {
  employees: readonly Employee[];
}

interface Node {
  emp: Employee;
  children: Node[];
}

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#1E40AF",
  Product: "#7C3AED",
  Sales: "#0F9D58",
  Finance: "#C2410C",
  Marketing: "#EC4899",
  Operations: "#06B6D4",
  Design: "#F59E0B",
};

function buildTree(employees: readonly Employee[]): Node[] {
  const byName = new Map<string, Employee>();
  for (const e of employees) byName.set(e.name, e);

  const roots: Node[] = [];
  const childrenByMgr = new Map<string, Employee[]>();
  for (const e of employees) {
    const mgr = e.reportsTo;
    // "—" or empty / self-managed → root.
    if (!mgr || mgr === "—" || mgr === e.name || !byName.has(mgr)) {
      // Defer pushing roots until we have all children grouped, but track them.
      continue;
    }
    const list = childrenByMgr.get(mgr) ?? [];
    list.push(e);
    childrenByMgr.set(mgr, list);
  }

  function build(emp: Employee): Node {
    const kids = childrenByMgr.get(emp.name) ?? [];
    return { emp, children: kids.map(build) };
  }

  for (const e of employees) {
    const mgr = e.reportsTo;
    if (!mgr || mgr === "—" || mgr === e.name || !byName.has(mgr)) {
      roots.push(build(e));
    }
  }
  return roots;
}

function NodeCard({ emp }: { emp: Employee }) {
  const deptColor = DEPT_COLORS[emp.department] ?? "var(--vyne-accent, var(--vyne-purple))";
  return (
    <div
      style={{
        width: 180,
        padding: "10px 12px",
        borderRadius: 10,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        boxShadow: "0 1px 3px rgba(16,24,40,0.05)",
        textAlign: "center",
        position: "relative",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          background: deptColor,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: emp.avatarGradient || deptColor,
          color: "#fff",
          margin: "8px auto 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {emp.initials}
      </div>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.005em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {emp.name}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginTop: 2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {emp.title}
      </div>
      <div
        style={{
          marginTop: 6,
          display: "inline-block",
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "2px 7px",
          borderRadius: 999,
          color: deptColor,
          background: "var(--content-secondary)",
        }}
      >
        {emp.department}
      </div>
    </div>
  );
}

function TreeNode({ node }: { node: Node }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <NodeCard emp={node.emp} />
      {node.children.length > 0 && (
        <>
          <div style={{ width: 1, height: 18, background: "var(--content-border)" }} />
          {node.children.length === 1 ? (
            // Single child — straight line, no horizontal bar
            <TreeNode node={node.children[0]} />
          ) : (
            <>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "space-around",
                  paddingTop: 0,
                  width: "100%",
                }}
              >
                {/* Horizontal connector */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: `calc(50% / ${node.children.length})`,
                    right: `calc(50% / ${node.children.length})`,
                    height: 1,
                    background: "var(--content-border)",
                  }}
                />
                {node.children.map((c) => (
                  <div
                    key={c.emp.id}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px" }}
                  >
                    <div style={{ width: 1, height: 18, background: "var(--content-border)" }} />
                    <TreeNode node={c} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function OrgChartTree({ employees }: Props) {
  const [zoom, setZoom] = useState(1);
  const tree = useMemo(() => buildTree(employees), [employees]);

  if (tree.length === 0) return null;

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Organization
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
            {employees.length} people · auto-built from reportsTo
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            aria-label="Zoom out"
            style={zoomBtn}
          >
            <ZoomOut size={14} />
          </button>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              minWidth: 38,
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
            aria-label="Zoom in"
            style={zoomBtn}
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset zoom"
            style={zoomBtn}
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </header>
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 32,
          background:
            "radial-gradient(circle at 50% 0%, rgba(108,71,255,0.04), transparent 60%)",
        }}
        className="content-scroll"
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
            display: "flex",
            justifyContent: "center",
            gap: 32,
          }}
        >
          {tree.map((root) => (
            <TreeNode key={root.emp.id} node={root} />
          ))}
        </div>
      </div>
    </div>
  );
}

const zoomBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 6,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  cursor: "pointer",
};
