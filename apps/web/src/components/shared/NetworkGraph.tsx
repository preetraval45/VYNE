"use client";

import { useMemo } from "react";

/**
 * NetworkGraph — node-link graph with a simple force-lite layout
 * computed once on mount (no per-frame ticks). Pure SVG.
 *
 *   <NetworkGraph
 *     nodes={[{ id: "deal:1", label: "Acme · $42k" }, …]}
 *     edges={[{ a: "deal:1", b: "contact:s1" }, …]}
 *   />
 *
 * Layout: 200-iteration spring relaxation seeded by a Sunflower
 * spiral so the result is deterministic across reloads. Suitable for
 * up to ~120 nodes; beyond that, swap for d3-force or a worker.
 *
 * Use case: explore which records reference which (Phase 20.11
 * `linkedRecords`).
 */

export interface NetworkNode {
  id: string;
  label?: string;
  /** Type label drives the node colour; defaults to a hash of id. */
  type?: string;
}

export interface NetworkEdge {
  a: string;
  b: string;
  /** Optional weight 0..1 — thicker edge for stronger relations. */
  weight?: number;
}

export interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (id: string) => void;
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

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function NetworkGraph({
  nodes,
  edges,
  width = 640,
  height = 480,
  onNodeClick,
}: NetworkGraphProps) {
  const positions = useMemo(() => {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 30;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const positions = new Map<string, { x: number; y: number }>();

    // 1) Sunflower seed positions for stability.
    nodes.forEach((n, i) => {
      const r = Math.sqrt(i / Math.max(nodes.length - 1, 1)) * radius;
      const angle = i * golden;
      positions.set(n.id, {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    });

    if (nodes.length < 2) return positions;

    // 2) Spring relaxation. k = ideal edge length.
    const k = Math.sqrt(((width * height) / nodes.length) * 0.6);
    const iterations = 200;
    const adjacency = new Map<string, Set<string>>();
    nodes.forEach((n) => adjacency.set(n.id, new Set()));
    edges.forEach((e) => {
      adjacency.get(e.a)?.add(e.b);
      adjacency.get(e.b)?.add(e.a);
    });

    let temperature = Math.max(width, height) / 8;
    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();
      nodes.forEach((n) => forces.set(n.id, { x: 0, y: 0 }));

      // Repulsion between all pairs.
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const pa = positions.get(a.id)!;
          const pb = positions.get(b.id)!;
          const dx = pa.x - pb.x;
          const dy = pa.y - pb.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = (k * k) / dist;
          forces.get(a.id)!.x += (dx / dist) * force;
          forces.get(a.id)!.y += (dy / dist) * force;
          forces.get(b.id)!.x -= (dx / dist) * force;
          forces.get(b.id)!.y -= (dy / dist) * force;
        }
      }

      // Attraction along edges.
      for (const e of edges) {
        const pa = positions.get(e.a);
        const pb = positions.get(e.b);
        if (!pa || !pb) continue;
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist * dist) / k;
        forces.get(e.a)!.x -= (dx / dist) * force;
        forces.get(e.a)!.y -= (dy / dist) * force;
        forces.get(e.b)!.x += (dx / dist) * force;
        forces.get(e.b)!.y += (dy / dist) * force;
      }

      // Apply with cooling.
      for (const n of nodes) {
        const p = positions.get(n.id)!;
        const f = forces.get(n.id)!;
        const len = Math.max(Math.sqrt(f.x * f.x + f.y * f.y), 1);
        const dx = (f.x / len) * Math.min(len, temperature);
        const dy = (f.y / len) * Math.min(len, temperature);
        p.x = Math.min(Math.max(p.x + dx, 20), width - 20);
        p.y = Math.min(Math.max(p.y + dy, 20), height - 20);
      }
      temperature *= 0.97;
    }

    return positions;
  }, [nodes, edges, width, height]);

  return (
    <svg
      role="img"
      aria-label="Entity relationship graph"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        display: "block",
        background: "var(--content-secondary)",
        borderRadius: 10,
      }}
    >
      {/* Edges */}
      {edges.map((e, i) => {
        const a = positions.get(e.a);
        const b = positions.get(e.b);
        if (!a || !b) return null;
        const w = (e.weight ?? 0.5) * 2.5 + 0.5;
        return (
          <line
            key={`e-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--content-border)"
            strokeWidth={w}
            opacity={0.65}
          />
        );
      })}
      {/* Nodes */}
      {nodes.map((n) => {
        const p = positions.get(n.id);
        if (!p) return null;
        const color = hashColor(n.type ?? n.id);
        return (
          <g
            key={n.id}
            style={{ cursor: onNodeClick ? "pointer" : "default" }}
            onClick={() => onNodeClick?.(n.id)}
          >
            <circle cx={p.x} cy={p.y} r={9} fill={color}>
              <title>{n.label ?? n.id}</title>
            </circle>
            {n.label && (
              <text
                x={p.x}
                y={p.y + 22}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-primary)"
                fontFamily="var(--font-app, inherit)"
                style={{ pointerEvents: "none" }}
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
