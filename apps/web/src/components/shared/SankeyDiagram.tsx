"use client";

import { useMemo } from "react";

/**
 * SankeyDiagram — funnel + flow viz with proportional ribbons.
 *
 *   <SankeyDiagram
 *     nodes={[
 *       { id: "Visitors" }, { id: "Lead" }, { id: "Opportunity" },
 *       { id: "Won" }, { id: "Lost" },
 *     ]}
 *     links={[
 *       { source: "Visitors", target: "Lead", value: 1200 },
 *       { source: "Lead", target: "Opportunity", value: 480 },
 *       { source: "Opportunity", target: "Won", value: 180 },
 *       { source: "Opportunity", target: "Lost", value: 300 },
 *     ]}
 *   />
 *
 * Layout:
 *   - Each node is auto-assigned a `column` based on the longest
 *     path from a source-only node (BFS).
 *   - Within a column, nodes stack vertically; height ∝ throughput.
 *   - Ribbons are cubic-Bezier paths; opacity 0.4 so overlaps stay
 *     legible.
 *
 * No external deps. Suitable for ≤ 60 nodes; layouts beyond that
 * benefit from d3-sankey's iterative relaxation.
 */

export interface SankeyNode {
  id: string;
  label?: string;
  /** Override colour. Default: auto-pick from accent palette. */
  color?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyDiagramProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
  /** Gap between nodes inside a column. Default 14 px. */
  nodePadding?: number;
  /** Width of node rects. Default 14 px. */
  nodeWidth?: number;
}

const PALETTE = [
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

export function SankeyDiagram({
  nodes,
  links,
  width = 720,
  height = 320,
  nodePadding = 14,
  nodeWidth = 14,
}: SankeyDiagramProps) {
  const layout = useMemo(() => {
    // 1) Column assignment via BFS from nodes with no incoming edges.
    const incoming = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const n of nodes) {
      incoming.set(n.id, 0);
      adjacency.set(n.id, []);
    }
    for (const l of links) {
      incoming.set(l.target, (incoming.get(l.target) ?? 0) + 1);
      adjacency.get(l.source)?.push(l.target);
    }
    const column = new Map<string, number>();
    const queue: string[] = [];
    for (const [id, n] of incoming) {
      if (n === 0) {
        column.set(id, 0);
        queue.push(id);
      }
    }
    while (queue.length) {
      const id = queue.shift()!;
      for (const next of adjacency.get(id) ?? []) {
        const c = (column.get(id) ?? 0) + 1;
        if ((column.get(next) ?? -1) < c) {
          column.set(next, c);
          queue.push(next);
        }
      }
    }
    let maxCol = 0;
    for (const c of column.values()) if (c > maxCol) maxCol = c;

    // 2) Throughput per node = max(in, out).
    const flowIn = new Map<string, number>();
    const flowOut = new Map<string, number>();
    for (const n of nodes) {
      flowIn.set(n.id, 0);
      flowOut.set(n.id, 0);
    }
    for (const l of links) {
      flowOut.set(l.source, (flowOut.get(l.source) ?? 0) + l.value);
      flowIn.set(l.target, (flowIn.get(l.target) ?? 0) + l.value);
    }
    const throughput = new Map<string, number>();
    for (const n of nodes) {
      throughput.set(
        n.id,
        Math.max(flowIn.get(n.id) ?? 0, flowOut.get(n.id) ?? 0),
      );
    }

    // 3) Bucket nodes per column, keeping insertion order (caller intent).
    const cols: string[][] = Array.from({ length: maxCol + 1 }, () => []);
    for (const n of nodes) {
      cols[column.get(n.id) ?? 0].push(n.id);
    }

    // 4) Compute y positions per column. Heights ∝ throughput; sum
    //    them up + node padding to fit `height`.
    const xStep = (width - nodeWidth) / Math.max(maxCol, 1);
    const positions = new Map<
      string,
      { x: number; y: number; height: number; col: number }
    >();
    for (let c = 0; c < cols.length; c++) {
      const ids = cols[c];
      const totalFlow = ids.reduce((s, id) => s + (throughput.get(id) ?? 0), 0);
      const padTotal = (ids.length - 1) * nodePadding;
      const usable = Math.max(height - padTotal, 60);
      let y = 0;
      for (const id of ids) {
        const h = totalFlow > 0
          ? Math.max(((throughput.get(id) ?? 0) / totalFlow) * usable, 14)
          : usable / Math.max(ids.length, 1);
        positions.set(id, {
          x: c * xStep,
          y,
          height: h,
          col: c,
        });
        y += h + nodePadding;
      }
    }

    // 5) Allocate ribbon offsets so multiple links from the same node
    //    don't overlap at the source/target edges.
    const sourceOffsets = new Map<string, number>();
    const targetOffsets = new Map<string, number>();
    const ribbons: Array<{
      d: string;
      thickness: number;
      color: string;
      label: string;
    }> = [];
    const sortedLinks = [...links].sort((a, b) => {
      const ya = positions.get(a.target)?.y ?? 0;
      const yb = positions.get(b.target)?.y ?? 0;
      return ya - yb;
    });
    for (const l of sortedLinks) {
      const s = positions.get(l.source);
      const t = positions.get(l.target);
      if (!s || !t) continue;
      const totalOut = flowOut.get(l.source) ?? 1;
      const totalIn = flowIn.get(l.target) ?? 1;
      const thickness = Math.max(
        ((l.value / Math.max(totalOut, totalIn)) * Math.min(s.height, t.height)),
        1,
      );
      const sOff = sourceOffsets.get(l.source) ?? 0;
      const tOff = targetOffsets.get(l.target) ?? 0;
      const sy = s.y + sOff + thickness / 2;
      const ty = t.y + tOff + thickness / 2;
      sourceOffsets.set(l.source, sOff + thickness);
      targetOffsets.set(l.target, tOff + thickness);
      const x0 = s.x + nodeWidth;
      const x1 = t.x;
      const dx = (x1 - x0) / 2;
      const d = `M${x0},${sy}C${x0 + dx},${sy} ${x1 - dx},${ty} ${x1},${ty}`;
      const color =
        nodes.find((n) => n.id === l.source)?.color ??
        PALETTE[s.col % PALETTE.length];
      ribbons.push({
        d,
        thickness,
        color,
        label: `${l.source} → ${l.target}: ${l.value}`,
      });
    }

    return { positions, ribbons, cols };
  }, [nodes, links, width, height, nodePadding, nodeWidth]);

  return (
    <svg
      role="img"
      aria-label="Sankey diagram"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
    >
      {/* Ribbons under nodes */}
      {layout.ribbons.map((r, i) => (
        <path
          key={`ribbon-${i}`}
          d={r.d}
          stroke={r.color}
          strokeWidth={r.thickness}
          fill="none"
          opacity={0.4}
        >
          <title>{r.label}</title>
        </path>
      ))}
      {/* Nodes */}
      {nodes.map((n, i) => {
        const pos = layout.positions.get(n.id);
        if (!pos) return null;
        const color = n.color ?? PALETTE[pos.col % PALETTE.length];
        return (
          <g key={n.id}>
            <rect
              x={pos.x}
              y={pos.y}
              width={nodeWidth}
              height={pos.height}
              fill={color}
              rx={2}
            >
              <title>{n.label ?? n.id}</title>
            </rect>
            <text
              x={
                pos.col === layout.cols.length - 1
                  ? pos.x - 6
                  : pos.x + nodeWidth + 6
              }
              y={pos.y + pos.height / 2 + 3}
              textAnchor={pos.col === layout.cols.length - 1 ? "end" : "start"}
              fontSize={11}
              fontWeight={600}
              fill="var(--text-primary)"
              fontFamily="var(--font-app, inherit)"
            >
              {n.label ?? n.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
