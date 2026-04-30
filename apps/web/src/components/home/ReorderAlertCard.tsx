"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useOpsStore } from "@/lib/stores/ops";
import { useMounted } from "@/hooks/useMounted";

const REORDER_POINT = 10;

/**
 * Shows a compact alert card on the home dashboard when any product
 * is out of stock or below the reorder point. Renders nothing when
 * inventory is healthy. Click-through goes to the Ops page.
 */
export function ReorderAlertCard() {
  const products = useOpsStore((s) => s.products);
  const mounted = useMounted();
  if (!mounted) return null;

  const lowOrOut = products.filter((p) => (p.stockQty ?? 0) < REORDER_POINT);
  if (lowOrOut.length === 0) return null;

  const out = lowOrOut.filter((p) => (p.stockQty ?? 0) === 0).length;
  const low = lowOrOut.length - out;

  return (
    <Link
      href="/ops"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: 14,
        borderRadius: 12,
        border: "1px solid #fed7aa",
        background: "linear-gradient(135deg, #fff7ed, #fffbeb)",
        textDecoration: "none",
        marginBottom: 14,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 10,
          background: "#fed7aa",
          color: "#9a3412",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#9a3412" }}>
          {out > 0 && `${out} out of stock`}
          {out > 0 && low > 0 && " · "}
          {low > 0 && `${low} below reorder point`}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "#9a3412",
            opacity: 0.85,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {lowOrOut
            .slice(0, 4)
            .map((p) => `${p.name}${p.stockQty != null ? ` (${p.stockQty})` : ""}`)
            .join(" · ")}
          {lowOrOut.length > 4 ? ` · +${lowOrOut.length - 4} more` : ""}
        </div>
      </div>
      <span
        style={{
          alignSelf: "center",
          fontSize: 11,
          fontWeight: 600,
          color: "#9a3412",
          padding: "4px 10px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.65)",
        }}
      >
        Review →
      </span>
    </Link>
  );
}
