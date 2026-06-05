"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  DollarSign,
  Package2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  type BomPart,
  buildCost,
  buildableUnits,
} from "@/lib/fixtures/bomTree";

/* ═══════════════════════════════════════════════════════════════
 * BOM Flowchart — recursive Reingold-Tilford-style tree layout
 * rendered in SVG. Each node is a card showing the part name, SKU,
 * unit cost, quantity required, and total cost contribution.
 *
 * Algorithm:
 *   1. First pass: post-order walk computes the **subtree width**
 *      of every node in nodeWidth units. Leaves = 1, internals =
 *      sum of children widths (or 1 if collapsed).
 *   2. Second pass: pre-order walk assigns each node an `x` at the
 *      centre of its subtree slot and `y` = depth × levelHeight.
 *   3. Render: nodes as <rect>+<text> groups; edges as cubic Béziers
 *      from parent bottom to child top so the connections curve.
 *
 * Time:  O(n) for layout, O(n) for render. n = visible nodes.
 * Space: O(n) for the laid-out node array.
 *
 * Collapse: clicking a node toggles a `Set<id>` of collapsed nodes.
 * Collapsed nodes render as leaves so their subtree drops out.
 * ═══════════════════════════════════════════════════════════════ */

const NODE_W = 180;
const NODE_H = 86;
const H_GAP = 18; // sibling gap (within a subtree)
const V_GAP = 60; // gap between levels

interface LaidOutNode {
  part: BomPart;
  quantity: number;
  depth: number;
  x: number;
  y: number;
  parentId: string | null;
  isLeafInRender: boolean;
  rollUpCost: number;
  childIds: string[];
  /** Unique id for this rendered occurrence (parts can repeat). */
  renderId: string;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (Math.abs(n) >= 100) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(2)}`;
}

function layoutTree(
  root: BomPart,
  collapsed: ReadonlySet<string>,
): { nodes: LaidOutNode[]; width: number; height: number } {
  // Pass 1: width in nodeWidth-units.
  function subtreeWidth(node: BomPart, key: string): number {
    if (collapsed.has(key) || node.children.length === 0) return 1;
    let w = 0;
    for (let i = 0; i < node.children.length; i++) {
      const link = node.children[i];
      w += subtreeWidth(link.node, `${key}/${i}-${link.node.id}`);
    }
    return Math.max(w, 1);
  }

  const nodes: LaidOutNode[] = [];

  // Pass 2: place nodes. `x0` is the left edge of this subtree slot
  // in pixel coordinates.
  function place(
    node: BomPart,
    quantity: number,
    parentRenderId: string | null,
    depth: number,
    x0: number,
    key: string,
  ): { rollUp: number; centreX: number; renderId: string } {
    const renderId = key;
    const widthU = subtreeWidth(node, key);
    const widthPx = widthU * NODE_W + (widthU - 1) * H_GAP;
    const isLeafInRender = collapsed.has(key) || node.children.length === 0;

    let rollUp: number;
    const childIds: string[] = [];
    if (isLeafInRender) {
      rollUp = node.unitCost * quantity;
    } else {
      rollUp = 0;
      let cursor = x0;
      for (let i = 0; i < node.children.length; i++) {
        const link = node.children[i];
        const childKey = `${key}/${i}-${link.node.id}`;
        const childWU = subtreeWidth(link.node, childKey);
        const childWPx = childWU * NODE_W + (childWU - 1) * H_GAP;
        const childRes = place(
          link.node,
          quantity * link.quantity,
          renderId,
          depth + 1,
          cursor,
          childKey,
        );
        rollUp += childRes.rollUp;
        childIds.push(childRes.renderId);
        cursor += childWPx + H_GAP;
      }
    }

    const centreX = x0 + widthPx / 2;
    const y = depth * (NODE_H + V_GAP);
    nodes.push({
      part: node,
      quantity,
      depth,
      x: centreX - NODE_W / 2,
      y,
      parentId: parentRenderId,
      isLeafInRender,
      rollUpCost: rollUp,
      childIds,
      renderId,
    });
    return { rollUp, centreX, renderId };
  }

  const rootKey = `0-${root.id}`;
  const rootW = subtreeWidth(root, rootKey);
  const totalWidth = rootW * NODE_W + (rootW - 1) * H_GAP;
  place(root, 1, null, 0, 0, rootKey);

  let maxDepth = 0;
  for (const n of nodes) if (n.depth > maxDepth) maxDepth = n.depth;
  const totalHeight = (maxDepth + 1) * NODE_H + maxDepth * V_GAP;

  return { nodes, width: totalWidth, height: totalHeight };
}

/* ─── Component ─────────────────────────────────────────────────── */

export function BOMFlowchart({
  root,
  onSelect,
}: {
  root: BomPart;
  onSelect?: (part: BomPart) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const layout = useMemo(() => layoutTree(root, collapsed), [root, collapsed]);
  const totalBuildCost = useMemo(() => buildCost(root), [root]);
  const buildable = useMemo(() => buildableUnits(root), [root]);
  const margin = root.unitCost - totalBuildCost;
  const marginPct = root.unitCost > 0 ? (margin / root.unitCost) * 100 : 0;

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nodeById = useMemo(() => {
    const m = new Map<string, LaidOutNode>();
    for (const n of layout.nodes) m.set(n.renderId, n);
    return m;
  }, [layout.nodes]);

  // SVG view padding so node borders aren't clipped.
  const pad = 18;
  const viewW = layout.width + pad * 2;
  const viewH = layout.height + pad * 2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: "16px 16px 8px",
      }}
    >
      {/* Header row: product summary + roll-up KPIs */}
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
        }}
      >
        <SummaryTile
          icon={<Package2 size={16} />}
          accent="#6C47FF"
          label="Final Product"
          value={root.name}
          hint={root.sku}
        />
        <SummaryTile
          icon={<DollarSign size={16} />}
          accent="#22C55E"
          label="Sell Price"
          value={fmt(root.unitCost)}
          hint="per unit"
        />
        <SummaryTile
          icon={<Layers size={16} />}
          accent="#06B6D4"
          label="Build Cost (BOM roll-up)"
          value={fmt(totalBuildCost)}
          hint="all leaves × cumulative qty"
        />
        <SummaryTile
          icon={<DollarSign size={16} />}
          accent={margin >= 0 ? "#22C55E" : "#EF4444"}
          label="Margin"
          value={`${fmt(margin)} · ${marginPct.toFixed(1)}%`}
          hint={margin >= 0 ? "profit" : "below cost"}
        />
        <SummaryTile
          icon={
            buildable >= 10 ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )
          }
          accent={
            buildable >= 10 ? "#22C55E" : buildable > 0 ? "#F59E0B" : "#EF4444"
          }
          label="Buildable units"
          value={buildable.toString()}
          hint={
            buildable === 0
              ? "blocked by a component"
              : buildable < 10
                ? "stock tight"
                : "comfortable"
          }
        />
      </header>

      {/* Legend / controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 11,
          color: "var(--text-tertiary)",
          flexWrap: "wrap",
        }}
      >
        <span>
          Click a node to {selected ? "deselect" : "highlight its lineage"}.
        </span>
        <span>·</span>
        <span>Use the chevron to collapse a subtree.</span>
        {collapsed.size > 0 && (
          <button
            type="button"
            onClick={() => setCollapsed(new Set())}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              borderRadius: 6,
              padding: "2px 10px",
              cursor: "pointer",
            }}
          >
            Expand all
          </button>
        )}
      </div>

      {/* Scrollable canvas */}
      <div
        style={{
          overflow: "auto",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          background:
            "radial-gradient(800px 400px at 0% 0%, rgba(108,71,255,0.04), transparent 60%), radial-gradient(700px 380px at 100% 100%, rgba(6,182,212,0.04), transparent 60%), var(--content-bg)",
        }}
      >
        <svg
          width={viewW}
          height={viewH}
          viewBox={`0 0 ${viewW} ${viewH}`}
          style={{ display: "block" }}
          role="img"
          aria-label={`Bill of materials tree for ${root.name}`}
        >
          {/* Edges first so node rectangles render on top */}
          <g transform={`translate(${pad}, ${pad})`}>
            {layout.nodes.map((n) => {
              if (!n.parentId) return null;
              const parent = nodeById.get(n.parentId);
              if (!parent) return null;
              const isInLineage =
                hovered === n.renderId ||
                hovered === parent.renderId ||
                selected === n.renderId ||
                selected === parent.renderId;
              const x1 = parent.x + NODE_W / 2;
              const y1 = parent.y + NODE_H;
              const x2 = n.x + NODE_W / 2;
              const y2 = n.y;
              const midY = (y1 + y2) / 2;
              const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
              return (
                <path
                  key={n.renderId}
                  d={d}
                  fill="none"
                  stroke={
                    isInLineage
                      ? "var(--vyne-accent, #06B6D4)"
                      : "var(--content-border)"
                  }
                  strokeWidth={isInLineage ? 2 : 1.25}
                  opacity={selected && !isInLineage ? 0.25 : 1}
                />
              );
            })}

            {/* Nodes */}
            {layout.nodes.map((n) => {
              const isSelected = selected === n.renderId;
              const isHovered = hovered === n.renderId;
              const isRoot = n.depth === 0;
              const stockHealthy = n.part.stockQty >= n.quantity * 10;
              const stockTight = n.part.stockQty < n.quantity * 2;
              const accent = isRoot
                ? "#6C47FF"
                : stockTight
                  ? "#EF4444"
                  : stockHealthy
                    ? "#22C55E"
                    : "#F59E0B";

              return (
                <g
                  key={n.renderId}
                  transform={`translate(${n.x}, ${n.y})`}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(n.renderId)}
                  onMouseLeave={() =>
                    setHovered((p) => (p === n.renderId ? null : p))
                  }
                  onClick={() => {
                    setSelected((prev) =>
                      prev === n.renderId ? null : n.renderId,
                    );
                    if (onSelect) onSelect(n.part);
                  }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    fill="var(--content-bg)"
                    stroke={
                      isSelected || isHovered ? accent : "var(--content-border)"
                    }
                    strokeWidth={isSelected ? 2 : 1.25}
                  />
                  {/* Accent strip on the left */}
                  <rect width={4} height={NODE_H} rx={2} fill={accent} />
                  {/* Name */}
                  <text
                    x={14}
                    y={20}
                    fontSize={12}
                    fontWeight={700}
                    fill="var(--text-primary)"
                  >
                    {n.part.name.length > 22
                      ? `${n.part.name.slice(0, 21)}…`
                      : n.part.name}
                  </text>
                  {/* SKU + qty pill */}
                  <text x={14} y={36} fontSize={10} fill="var(--text-tertiary)">
                    {n.part.sku} · {n.quantity}× per build
                  </text>
                  {/* Cost line */}
                  <text
                    x={14}
                    y={54}
                    fontSize={10.5}
                    fill="var(--text-secondary)"
                  >
                    Unit:{" "}
                    <tspan fontWeight={600} fill="var(--text-primary)">
                      {fmt(n.part.unitCost)}
                    </tspan>
                  </text>
                  <text
                    x={14}
                    y={70}
                    fontSize={10.5}
                    fill="var(--text-secondary)"
                  >
                    Roll-up:{" "}
                    <tspan fontWeight={700} fill={accent}>
                      {fmt(n.rollUpCost)}
                    </tspan>
                  </text>
                  {/* Stock indicator on right */}
                  <text
                    x={NODE_W - 12}
                    y={20}
                    textAnchor="end"
                    fontSize={10}
                    fill={accent}
                    fontWeight={600}
                  >
                    {n.part.stockQty} {n.part.uom}
                  </text>
                  {/* Collapse chevron, only if this node has children */}
                  {n.part.children.length > 0 && (
                    <g
                      transform={`translate(${NODE_W - 22}, ${NODE_H - 22})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(n.renderId);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        width={18}
                        height={18}
                        rx={5}
                        fill="var(--content-secondary)"
                      />
                      <g
                        transform={`translate(2, 2)`}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {n.isLeafInRender ? (
                          <ChevronRight size={14} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={14} aria-hidden="true" />
                        )}
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ─── Summary tile ──────────────────────────────────────────────── */

function SummaryTile({
  icon,
  accent,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  value: string;
  hint?: string;
}) {
  const style: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--content-border)",
    background: `linear-gradient(135deg, ${accent}10 0%, transparent 70%), var(--content-bg)`,
    overflow: "hidden",
  };
  return (
    <div style={style}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: accent,
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "var(--text-primary)",
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}
