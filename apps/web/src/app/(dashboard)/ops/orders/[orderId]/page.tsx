"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Check,
  Truck,
  PackageCheck,
  XCircle,
  Trash2,
  Mail,
  Calendar,
  ShoppingCart,
} from "lucide-react";
import { useOpsStore } from "@/lib/stores/ops";
import { erpApi } from "@/lib/api/client";
import type { ERPOrder } from "@/lib/api/client";
import { STATUS_MAP, type StatusKey } from "@/lib/fixtures/ops";

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const s = STATUS_MAP[status as StatusKey] ?? {
    label: status,
    bg: "var(--content-secondary)",
    color: "var(--text-secondary)",
  };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// Allowed forward transitions per status, mirroring the Orders-table actions.
const TRANSITIONS: Record<
  ERPOrder["status"],
  Array<{ to: ERPOrder["status"]; label: string; icon: React.ReactNode }>
> = {
  draft: [
    { to: "confirmed", label: "Confirm", icon: <Check size={14} /> },
    { to: "cancelled", label: "Cancel", icon: <XCircle size={14} /> },
  ],
  confirmed: [
    { to: "shipped", label: "Ship", icon: <Truck size={14} /> },
    { to: "cancelled", label: "Cancel", icon: <XCircle size={14} /> },
  ],
  shipped: [
    {
      to: "delivered",
      label: "Mark delivered",
      icon: <PackageCheck size={14} />,
    },
  ],
  delivered: [],
  cancelled: [],
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = decodeURIComponent(params.orderId ?? "");

  const orders = useOpsStore((s) => s.orders);
  const updateOrder = useOpsStore((s) => s.updateOrder);
  const deleteOrder = useOpsStore((s) => s.deleteOrder);

  // Match by store id first, then fall back to the human order number so
  // both /ops/orders/o1 and /ops/orders/ORD-001 resolve.
  const order = useMemo(
    () =>
      orders.find((o) => o.id === orderId) ??
      orders.find((o) => o.orderNumber === orderId) ??
      null,
    [orders, orderId],
  );

  const lineTotal = useMemo(
    () =>
      (order?.lines ?? []).reduce(
        (sum, l) => sum + l.quantity * l.unitPrice,
        0,
      ),
    [order],
  );

  if (!order) {
    return (
      <div style={{ padding: 40, maxWidth: 640, margin: "0 auto" }}>
        <Link
          href="/ops?view=orders"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-secondary)",
            textDecoration: "none",
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={15} /> Back to Orders
        </Link>
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            background: "var(--content-bg)",
          }}
        >
          <ShoppingCart
            size={32}
            style={{ color: "var(--text-tertiary)", marginBottom: 12 }}
          />
          <h1
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 6px",
            }}
          >
            Order not found
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
            No order matches &quot;{orderId}&quot;. It may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  function changeStatus(to: ERPOrder["status"]) {
    if (!order) return;
    updateOrder(order.id, { status: to });
    if (to === "confirmed") erpApi.confirmOrder(order.id).catch(() => {});
    else if (to === "shipped") erpApi.shipOrder(order.id).catch(() => {});
    else if (to === "delivered") erpApi.deliverOrder(order.id).catch(() => {});
    else if (to === "cancelled") erpApi.cancelOrder(order.id).catch(() => {});
    toast.success(`${order.orderNumber} → ${STATUS_MAP[to]?.label ?? to}`);
  }

  function handleDelete() {
    if (!order) return;
    deleteOrder(order.id);
    toast.success(`${order.orderNumber} deleted`);
    router.push("/ops?view=orders");
  }

  const transitions = TRANSITIONS[order.status] ?? [];

  return (
    <div
      className="content-scroll"
      style={{ height: "100%", overflowY: "auto" }}
    >
      <div
        style={{ maxWidth: 760, margin: "0 auto", padding: "24px 24px 48px" }}
      >
        <Link
          href="/ops?view=orders"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-secondary)",
            textDecoration: "none",
            marginBottom: 18,
          }}
        >
          <ArrowLeft size={15} /> Back to Orders
        </Link>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {order.customerName}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {transitions.map((t) => (
              <button
                key={t.to}
                type="button"
                onClick={() => changeStatus(t.to)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border:
                    t.to === "cancelled"
                      ? "1px solid var(--status-danger)"
                      : "none",
                  background:
                    t.to === "cancelled"
                      ? "transparent"
                      : "var(--vyne-accent, var(--vyne-purple))",
                  color: t.to === "cancelled" ? "var(--status-danger)" : "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete order"
              title="Delete order"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                color: "var(--text-tertiary)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {/* Meta cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <InfoCard
            icon={<ShoppingCart size={14} />}
            label="Customer"
            value={order.customerName}
          />
          <InfoCard
            icon={<Mail size={14} />}
            label="Email"
            value={order.customerEmail || "—"}
          />
          <InfoCard
            icon={<Calendar size={14} />}
            label="Created"
            value={fmtDate(order.createdAt)}
          />
        </div>

        {/* Line items */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--content-border)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Line items
          </div>

          {order.lines && order.lines.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--table-header-bg)" }}>
                  {["Product", "Qty", "Unit price", "Subtotal"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 16px",
                        textAlign: i === 0 ? "left" : "right",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l, i) => (
                  <tr
                    key={l.id ?? `${l.productId}-${i}`}
                    style={{ borderTop: "1px solid var(--content-border)" }}
                  >
                    <td
                      style={{
                        padding: "10px 16px",
                        fontSize: 12.5,
                        color: "var(--text-primary)",
                      }}
                    >
                      {l.productName ?? l.productId}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        fontSize: 12.5,
                        textAlign: "right",
                        color: "var(--text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {l.quantity}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        fontSize: 12.5,
                        textAlign: "right",
                        color: "var(--text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ${l.unitPrice.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        fontSize: 12.5,
                        textAlign: "right",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ${(l.quantity * l.unitPrice).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                padding: "20px 16px",
                fontSize: 12.5,
                color: "var(--text-tertiary)",
              }}
            >
              No line-item breakdown was recorded for this order — only the
              order total is available.
            </div>
          )}

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px",
              borderTop: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
            }}
          >
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Order total
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              $
              {(order.lines && order.lines.length > 0
                ? lineTotal
                : order.total
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {icon} {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
