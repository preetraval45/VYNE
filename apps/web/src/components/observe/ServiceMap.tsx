"use client";

import { useMemo } from "react";
import type { Service } from "@/lib/fixtures/observe";

interface Props {
  services: readonly Service[];
}

interface NodeLayout {
  service: Service;
  x: number;
  y: number;
}

const WIDTH = 720;
const HEIGHT = 360;
const NODE_R = 32;

// Heuristic edges by name conventions — connect frontends → API gateway →
// backend services. Keeps the graph readable when fixtures grow.
function inferEdges(services: readonly Service[]): Array<[string, string]> {
  const byName = new Map(services.map((s) => [s.name.toLowerCase(), s]));
  const edges: Array<[string, string]> = [];
  const gateway = services.find((s) => /gateway|api/i.test(s.name));
  if (gateway) {
    for (const s of services) {
      if (s.id === gateway.id) continue;
      if (/web|mobile|frontend|app/i.test(s.name)) {
        edges.push([s.id, gateway.id]);
      } else {
        edges.push([gateway.id, s.id]);
      }
    }
    return edges;
  }
  // No gateway? Star-network from the first service.
  if (services.length > 0) {
    const root = services[0];
    for (const s of services.slice(1)) edges.push([root.id, s.id]);
  }
  // Avoid unused warning
  void byName;
  return edges;
}

function statusColor(s: Service["status"]): { stroke: string; fill: string } {
  if (s === "healthy") return { stroke: "#0F9D58", fill: "rgba(15,157,88,0.10)" };
  if (s === "degraded") return { stroke: "#C2410C", fill: "rgba(217,119,6,0.10)" };
  return { stroke: "#B91C1C", fill: "rgba(220,38,38,0.10)" };
}

function layoutNodes(services: readonly Service[]): NodeLayout[] {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const r = Math.min(WIDTH, HEIGHT) / 2 - NODE_R - 20;

  const gateway = services.find((s) => /gateway|api/i.test(s.name));
  const peripherals = services.filter((s) => s.id !== gateway?.id);

  const nodes: NodeLayout[] = [];
  if (gateway) nodes.push({ service: gateway, x: cx, y: cy });
  peripherals.forEach((s, i) => {
    const angle = (i / Math.max(1, peripherals.length)) * Math.PI * 2 - Math.PI / 2;
    nodes.push({ service: s, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  });
  return nodes;
}

export function ServiceMap({ services }: Props) {
  const nodes = useMemo(() => layoutNodes(services), [services]);
  const edges = useMemo(() => inferEdges(services), [services]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.service.id, n])), [nodes]);

  if (services.length === 0) return null;

  return (
    <section
      aria-label="Service map"
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Service map
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
            {services.length} service{services.length === 1 ? "" : "s"} · auto-discovered topology
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-tertiary)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0F9D58" }} /> healthy
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C2410C" }} /> degraded
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#B91C1C" }} /> down
          </span>
        </div>
      </header>

      <div style={{ overflowX: "auto" }}>
        <svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Auto-discovered service topology"
          style={{ display: "block", width: "100%", maxWidth: WIDTH }}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 z" fill="var(--text-tertiary)" />
            </marker>
          </defs>

          {edges.map(([fromId, toId], i) => {
            const a = nodeById.get(fromId);
            const b = nodeById.get(toId);
            if (!a || !b) return null;
            return (
              <line
                key={`${fromId}-${toId}-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--content-border)"
                strokeWidth={1.4}
                markerEnd="url(#arrow)"
              />
            );
          })}

          {nodes.map((n) => {
            const c = statusColor(n.service.status);
            return (
              <g key={n.service.id} transform={`translate(${n.x}, ${n.y})`}>
                <circle
                  r={NODE_R}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={1.5}
                />
                <text
                  textAnchor="middle"
                  dy={-2}
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--text-primary)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {n.service.name.length > 10 ? `${n.service.name.slice(0, 9)}…` : n.service.name}
                </text>
                <text
                  textAnchor="middle"
                  dy={12}
                  fontSize={10}
                  fill={c.stroke}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {n.service.responseMs}ms · {n.service.errorRate.toFixed(2)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
