"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OpsDashboardView } from "@/components/ops/OpsDashboardView";
import { useSearchIndex } from "@/hooks/useSearchIndex";
import toast from "react-hot-toast";
import { useOpsStore } from "@/lib/stores/ops";
import { BOMFlowchart } from "@/components/ops/BOMFlowchart";
import { DEMO_BOM_TREES } from "@/lib/fixtures/bomTree";
import { undoableDelete } from "@/lib/undo";
import { SearchBar as SharedSearchBar } from "@/components/shared/SearchBar";
import { WorkOrderGantt } from "@/components/ops/WorkOrderGantt";
import {
  DetailPanel,
  DetailSection,
  DetailRow,
  useDetailParam,
} from "@/components/shared/DetailPanel";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Check,
  AlertTriangle,
  X,
  TrendingUp,
  ShoppingCart,
  Truck,
  Factory,
} from "lucide-react";
import {
  erpApi,
  type ERPProduct,
  type ERPOrder,
  type ERPSupplier,
  type ERPBOM,
  type ERPWorkOrder,
} from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { ExportButton } from "@/components/shared/ExportButton";
import { DemoDataBanner } from "@/components/shared/DemoDataBanner";
import { EditableCell } from "@/components/shared/EditableCell";
import { PageHeader, Pill } from "@/components/shared/Kit";
import { PageDashboard } from "@/components/shared/PageDashboard";
import { BulkActionsBar } from "@/components/shared/BulkActionsBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { usePageDashboard } from "@/hooks/usePageDashboard";
import { useRegisterCommands } from "@/hooks/useRegisterCommands";
import { AskAiButton } from "@/components/shared/AskAiButton";
import { useAiSuggestedPrompts } from "@/hooks/useAiSuggestedPrompts";
import { useRegisterAiCommands } from "@/hooks/useRegisterAiCommands";
import { Trash2 } from "lucide-react";
import {
  MOCK_PRODUCTS,
  MOCK_ORDERS,
  MOCK_SUPPLIERS,
  MOCK_BOMS,
  MOCK_WORK_ORDERS,
  STATUS_MAP,
  type StatusKey,
} from "@/lib/fixtures/ops";

// Roll up the unit cost of a BOM by summing each component's costPrice
// times its quantity. Components are matched against the products list
// by id; missing components contribute 0 (graceful degradation).
function computeBomCost(bom: ERPBOM, products: ERPProduct[]): number {
  const byId = new Map(products.map((p) => [p.id, p]));
  let total = 0;
  for (const c of bom.components ?? []) {
    const p = byId.get(c.componentId);
    const cost = p?.costPrice ?? 0;
    total += cost * (c.quantity ?? 0);
  }
  return Math.round(total * 100) / 100;
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const s = STATUS_MAP[status as StatusKey] ?? {
    label: status,
    bg: "var(--content-secondary)",
    color: "var(--text-secondary)",
  };
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function TabBtn({
  label,
  active,
  onClick,
}: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        background: active
          ? "var(--vyne-accent, var(--vyne-purple))"
          : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background =
            "var(--content-secondary)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}
function Modal({
  open,
  onClose,
  title,
  children,
  width = 480,
}: Readonly<ModalProps>) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: "var(--content-bg)",
          borderRadius: 12,
          width,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 4,
              borderRadius: 6,
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  background: "var(--content-secondary)",
  outline: "none",
  fontSize: 13,
  color: "var(--text-primary)",
  boxSizing: "border-box",
};

// â”€â”€â”€ Overview tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OverviewTab({
  products,
  orders,
}: Readonly<{ products: ERPProduct[]; orders: ERPOrder[] }>) {
  const inStock = products.filter((p) => p.status === "in_stock").length;
  const lowStock = products.filter(
    (p) => p.status === "low_stock" || p.status === "out_of_stock",
  ).length;
  const activeOrders = orders.filter(
    (o) => o.status === "confirmed" || o.status === "shipped",
  ).length;
  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div>
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            icon: (
              <Package
                size={18}
                style={{ color: "var(--vyne-accent, var(--vyne-purple))" }}
              />
            ),
            label: "Total Products",
            value: products.length.toString(),
            sub: `${inStock} in stock`,
            bg: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)",
          },
          {
            icon: (
              <ShoppingCart size={18} style={{ color: "var(--status-info)" }} />
            ),
            label: "Active Orders",
            value: activeOrders.toString(),
            sub: `${orders.filter((o) => o.status === "draft").length} drafts`,
            bg: "rgba(59,130,246,0.08)",
          },
          {
            icon: (
              <AlertTriangle
                size={18}
                style={{ color: "var(--status-warning)" }}
              />
            ),
            label: "Low Stock Alerts",
            value: lowStock.toString(),
            sub: "items need reorder",
            bg: "rgba(245,158,11,0.08)",
          },
          {
            icon: (
              <TrendingUp
                size={18}
                style={{ color: "var(--status-success)" }}
              />
            ),
            label: "Revenue (Delivered)",
            value: `$${revenue.toLocaleString()}`,
            sub: "all time",
            bg: "rgba(34,197,94,0.08)",
          },
        ].map(({ icon, label, value, sub, bg }) => (
          <div
            key={label}
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              {icon}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders + Low stock */}
      <div
        className="two-pane-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr minmax(0, 280px)",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--content-border)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Recent Orders
          </div>
          <table
            className="m-cards"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "var(--table-header-bg)" }}>
                {["Order #", "Customer", "Total", "Status", "Date"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 16px",
                      textAlign: "left",
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
              {orders.slice(0, 5).map((o) => (
                <tr
                  key={o.id}
                  style={{ borderTop: "1px solid var(--content-border)" }}
                >
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--vyne-accent, var(--vyne-purple))",
                    }}
                  >
                    {o.orderNumber}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                    }}
                  >
                    {o.customerName}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    ${o.total.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <StatusBadge status={o.status} />
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {formatRelativeTime(o.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--content-border)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Low Stock Alerts
          </div>
          <div style={{ padding: "8px 0" }}>
            {products
              .filter((p) => p.status !== "in_stock")
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 16px",
                  }}
                >
                  <AlertTriangle
                    size={13}
                    style={{
                      color:
                        p.status === "out_of_stock"
                          ? "var(--status-danger)"
                          : "var(--status-warning)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--text-primary)" }}>
                      {p.name}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                    >
                      {p.sku} · {p.stockQty} left
                    </div>
                  </div>
                  <StatusBadge status={p.status ?? "in_stock"} />
                  <Link
                    href={`/ops/orders/new?product=${encodeURIComponent(p.id)}&qty=${Math.max(20, 30 - p.stockQty)}`}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: "var(--vyne-accent, #5B5BD6)",
                      color: "#fff",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Order more
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Inventory tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function stockQtyColor(qty: number): string {
  if (qty === 0) return "var(--status-danger)";
  if (qty <= 10) return "var(--status-warning)";
  return "var(--text-primary)";
}

function InventoryTab({
  products,
  setProducts,
}: Readonly<{
  products: ERPProduct[];
  setProducts: (p: ERPProduct[]) => void;
}>) {
  const router = useRouter();
  const productDetail = useDetailParam("product");
  const selectedProduct = productDetail.id
    ? products.find((p) => p.id === productDetail.id)
    : undefined;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState<ERPProduct | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    costPrice: "",
    stockQty: "",
    uom: "pcs",
    categoryName: "",
  });
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("received");

  // DSA: token-trie search index â€” O(prefix-len + matches) per keystroke.
  const filtered = useSearchIndex(
    products,
    (p) => [p.name, p.sku],
    debouncedSearch,
  );

  // Bulk selection (Phase 11.2) â€” multi-select products for batch
  // delete with undo. Pattern matches Contacts / Invoicing.
  const sel = useBulkSelection();

  function addProduct() {
    const product: ERPProduct = {
      id: `p${Date.now()}`,
      name: form.name,
      sku: form.sku,
      price: Number.parseFloat(form.price) || 0,
      costPrice: Number.parseFloat(form.costPrice) || 0,
      stockQty: Number.parseInt(form.stockQty) || 0,
      uom: form.uom,
      categoryName: form.categoryName,
      status: "in_stock",
    };
    setProducts([...products, product]);
    erpApi.createProduct(product).catch(() => {});
    setAddOpen(false);
    setForm({
      name: "",
      sku: "",
      price: "",
      costPrice: "",
      stockQty: "",
      uom: "pcs",
      categoryName: "",
    });
  }

  function adjustStock() {
    if (!adjustOpen) return;
    const delta = Number.parseInt(adjustQty) || 0;
    setProducts(
      products.map((p) => {
        if (p.id !== adjustOpen.id) return p;
        const newQty = Math.max(0, p.stockQty + delta);
        let status: ERPProduct["status"] = "in_stock";
        if (newQty === 0) status = "out_of_stock";
        else if (newQty <= 10) status = "low_stock";
        return { ...p, stockQty: newQty, status };
      }),
    );
    erpApi.adjustStock(adjustOpen.id, delta, adjustReason).catch(() => {});
    setAdjustOpen(null);
    setAdjustQty("");
  }

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, maxWidth: 320 }}>
          <SharedSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search productsâ€¦"
            width={320}
            onWorkspaceSearch={() =>
              window.dispatchEvent(
                new CustomEvent("vyne:open-palette", {
                  detail: { query: search },
                }),
              )
            }
          />
        </div>
        <button
          onClick={() => router.push("/ops/products/new")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Plus size={13} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table
          className="m-cards"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              <th
                style={{ padding: "9px 12px", width: 32, textAlign: "center" }}
              >
                <input
                  type="checkbox"
                  aria-label="Select all products"
                  checked={
                    filtered.length > 0 &&
                    sel.isAllSelected(filtered.map((p) => p.id))
                  }
                  ref={(el) => {
                    if (el)
                      el.indeterminate = sel.isSomeSelected(
                        filtered.map((p) => p.id),
                      );
                  }}
                  onChange={(e) => {
                    if (e.target.checked)
                      sel.selectAll(filtered.map((p) => p.id));
                    else sel.clear();
                  }}
                  style={{ cursor: "pointer" }}
                />
              </th>
              {[
                "SKU",
                "Product",
                "Category",
                "Stock",
                "UOM",
                "Cost",
                "Price",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "9px 14px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => productDetail.open(p.id)}
                style={{
                  borderTop: "1px solid var(--content-border)",
                  cursor: "pointer",
                  background: sel.isSelected(p.id)
                    ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)"
                    : undefined,
                }}
                onMouseEnter={(e) => {
                  if (sel.isSelected(p.id)) return;
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "var(--content-secondary)";
                }}
                onMouseLeave={(e) => {
                  if (sel.isSelected(p.id)) return;
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "transparent";
                }}
              >
                <td
                  style={{ padding: "10px 12px", textAlign: "center" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.name}`}
                    checked={sel.isSelected(p.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      sel.handleRowClick(
                        filtered.map((x) => x.id),
                        p.id,
                        (e.nativeEvent as MouseEvent).shiftKey,
                      );
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "var(--text-secondary)",
                  }}
                >
                  <EditableCell
                    value={p.sku}
                    onSave={(v) =>
                      useOpsStore.getState().updateProduct(p.id, { sku: v })
                    }
                    label="SKU"
                    cellKey={`product:${p.id}#sku`}
                  />
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  <EditableCell
                    value={p.name}
                    onSave={(v) =>
                      useOpsStore.getState().updateProduct(p.id, { name: v })
                    }
                    label="Product name"
                    cellKey={`product:${p.id}#name`}
                  />
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {p.categoryName ?? "â€”"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: stockQtyColor(p.stockQty),
                    fontWeight: 600,
                  }}
                >
                  <EditableCell
                    value={p.stockQty}
                    onSave={(v) =>
                      useOpsStore.getState().updateProduct(p.id, {
                        stockQty: Math.max(0, Number(v) || 0),
                      })
                    }
                    type="number"
                    label="Stock qty"
                    cellKey={`product:${p.id}#stockQty`}
                    validate={(s) => (Number(s) < 0 ? "Must be â‰¥ 0" : null)}
                  />
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {p.uom}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <EditableCell
                    value={p.costPrice}
                    onSave={(v) =>
                      useOpsStore
                        .getState()
                        .updateProduct(p.id, { costPrice: Number(v) || 0 })
                    }
                    type="number"
                    label="Cost price"
                    cellKey={`product:${p.id}#costPrice`}
                    validate={(s) => (Number(s) < 0 ? "Must be â‰¥ 0" : null)}
                    render={(v) => `$${Number(v).toFixed(2)}`}
                  />
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  <EditableCell
                    value={p.price}
                    onSave={(v) =>
                      useOpsStore
                        .getState()
                        .updateProduct(p.id, { price: Number(v) || 0 })
                    }
                    type="number"
                    label="Price"
                    cellKey={`product:${p.id}#price`}
                    validate={(s) => (Number(s) < 0 ? "Must be â‰¥ 0" : null)}
                    render={(v) => `$${Number(v).toFixed(2)}`}
                  />
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <StatusBadge status={p.status ?? "in_stock"} />
                </td>
                <td
                  style={{ padding: "10px 14px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setAdjustOpen(p)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--content-border)",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <Edit2 size={11} /> Adjust
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => {
                        if (
                          !confirm(
                            `Delete ${p.name}? You'll have 5 seconds to undo.`,
                          )
                        )
                          return;
                        const snapshot = { ...p };
                        undoableDelete({
                          label: `Deleted product â€” ${snapshot.name}`,
                          mutate: () =>
                            useOpsStore.getState().deleteProduct(snapshot.id),
                          restore: () =>
                            useOpsStore.getState().addProduct(snapshot),
                        });
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "3px 6px",
                        borderRadius: 6,
                        border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.06)",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "var(--status-danger)",
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            No products found
          </div>
        )}
      </div>

      <BulkActionsBar
        count={sel.selectedCount}
        onClear={sel.clear}
        actions={[
          {
            id: "delete",
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onClick: () => {
              const ids = Array.from(sel.selectedIds);
              const snapshots = ids
                .map((id) => products.find((p) => p.id === id))
                .filter((p): p is ERPProduct => Boolean(p));
              undoableDelete({
                label: `Deleted ${ids.length} product${ids.length === 1 ? "" : "s"}`,
                mutate: () =>
                  ids.forEach((id) => useOpsStore.getState().deleteProduct(id)),
                restore: () => {
                  for (const p of snapshots)
                    useOpsStore.getState().addProduct(p);
                },
              });
              sel.clear();
            },
          },
        ]}
      />

      {/* Add Product modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Product"
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <FormField label="Product Name">
            <input
              id="prod-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="iPhone 16 Pro"
              style={inputStyle}
            />
          </FormField>
          <FormField label="SKU">
            <input
              id="prod-sku"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="IPH-001"
              style={inputStyle}
            />
          </FormField>
          <FormField label="Cost Price ($)">
            <input
              id="prod-cost"
              type="number"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              placeholder="720.00"
              style={inputStyle}
            />
          </FormField>
          <FormField label="Sale Price ($)">
            <input
              id="prod-price"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="999.00"
              style={inputStyle}
            />
          </FormField>
          <FormField label="Initial Stock">
            <input
              id="prod-stock"
              type="number"
              value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
              placeholder="100"
              style={inputStyle}
            />
          </FormField>
          <FormField label="Unit of Measure">
            <select
              aria-label="Select option"
              id="prod-uom"
              value={form.uom}
              onChange={(e) => setForm({ ...form, uom: e.target.value })}
              style={{ ...inputStyle }}
            >
              {["pcs", "kg", "litre", "box", "dozen", "metre"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </FormField>
          <div style={{ gridColumn: "1/-1" }}>
            <FormField label="Category">
              <input
                id="prod-cat"
                value={form.categoryName}
                onChange={(e) =>
                  setForm({ ...form, categoryName: e.target.value })
                }
                placeholder="Electronics"
                style={inputStyle}
              />
            </FormField>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <button
            onClick={() => setAddOpen(false)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={addProduct}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-accent, var(--vyne-purple))",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Create Product
          </button>
        </div>
      </Modal>

      {/* Adjust stock modal */}
      <Modal
        open={!!adjustOpen}
        onClose={() => setAdjustOpen(null)}
        title={`Adjust Stock â€” ${adjustOpen?.name}`}
        width={380}
      >
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            background: "var(--table-header-bg)",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Current stock
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {adjustOpen?.stockQty ?? 0} {adjustOpen?.uom}
          </div>
        </div>
        <FormField label="Quantity Change (+/-)">
          <input
            id="adj-qty"
            type="number"
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
            placeholder="+50 or -10"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Reason">
          <select
            aria-label="Select option"
            id="adj-reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            style={{ ...inputStyle }}
          >
            {["received", "sold", "damaged", "return", "audit", "other"].map(
              (r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ),
            )}
          </select>
        </FormField>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setAdjustOpen(null)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={adjustStock}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-accent, var(--vyne-purple))",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Apply Adjustment
          </button>
        </div>
      </Modal>

      {/* Slide-in product detail panel */}
      <ProductDetailPanel
        product={selectedProduct}
        onClose={productDetail.close}
      />
    </div>
  );
}

function ProductDetailPanel({
  product,
  onClose,
}: {
  product: ERPProduct | undefined;
  onClose: () => void;
}) {
  if (!product) {
    return (
      <DetailPanel open={false} onClose={onClose} title="">
        <></>
      </DetailPanel>
    );
  }
  const margin =
    product.price > 0 && product.costPrice > 0
      ? Math.round(((product.price - product.costPrice) / product.price) * 100)
      : 0;
  return (
    <DetailPanel
      open
      onClose={onClose}
      title={product.name}
      subtitle={product.categoryName ?? "Uncategorized"}
      badge={<StatusBadge status={product.status ?? "in_stock"} />}
    >
      <DetailSection title="Margin">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              className="text-aurora"
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1,
              }}
            >
              {margin}%
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              Gross margin
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              ${(product.price - product.costPrice).toFixed(2)}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              Per unit
            </div>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Pricing & stock">
        <DetailRow label="SKU" value={product.sku} mono />
        <DetailRow label="Sell price" value={`$${product.price.toFixed(2)}`} />
        <DetailRow
          label="Cost price"
          value={`$${product.costPrice.toFixed(2)}`}
        />
        <DetailRow
          label="Stock"
          value={`${product.stockQty.toLocaleString()} ${product.uom ?? "each"}`}
        />
      </DetailSection>
    </DetailPanel>
  );
}

// â”€â”€â”€ Orders tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OrdersTab({
  orders,
  setOrders,
}: Readonly<{ orders: ERPOrder[]; setOrders: (o: ERPOrder[]) => void }>) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerEmail: "" });

  const statuses = [
    "all",
    "draft",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ];
  // DSA: token-trie search index â€” O(prefix-len + matches) per keystroke.
  const searchHits = useSearchIndex(
    orders,
    (o) => [o.customerName, o.orderNumber],
    debouncedSearch,
  );
  const filtered = searchHits.filter(
    (o) => filter === "all" || o.status === filter,
  );

  function updateOrderStatus(id: string, status: ERPOrder["status"]) {
    setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
    if (status === "confirmed") erpApi.confirmOrder(id).catch(() => {});
    else if (status === "shipped") erpApi.shipOrder(id).catch(() => {});
    else if (status === "delivered") erpApi.deliverOrder(id).catch(() => {});
    else if (status === "cancelled") erpApi.cancelOrder(id).catch(() => {});
  }

  function createOrder() {
    const order: ERPOrder = {
      id: `o${Date.now()}`,
      orderNumber: `ORD-${String(orders.length + 1).padStart(3, "0")}`,
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      status: "draft",
      total: 0,
      createdAt: new Date().toISOString(),
    };
    setOrders([order, ...orders]);
    erpApi.createOrder(order).catch(() => {});
    setNewOpen(false);
    setForm({ customerName: "", customerEmail: "" });
  }

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "5px 10px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
                background:
                  filter === s
                    ? "var(--vyne-accent, var(--vyne-purple))"
                    : "var(--content-secondary)",
                color: filter === s ? "#fff" : "var(--text-secondary)",
                textTransform: "capitalize",
              }}
            >
              {s === "all" ? "All" : (STATUS_MAP[s as StatusKey]?.label ?? s)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              borderRadius: 8,
              padding: "5px 10px",
            }}
          >
            <Search size={12} style={{ color: "var(--text-tertiary)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ordersâ€¦"
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 12,
                color: "var(--text-primary)",
                width: 160,
              }}
            />
          </div>
          <button
            onClick={() => router.push("/ops/orders/new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-accent, var(--vyne-purple))",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <Plus size={13} /> New Order
          </button>
        </div>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table
          className="m-cards"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {[
                "Order #",
                "Customer",
                "Date",
                "Total",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "9px 14px",
                    textAlign: "left",
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
            {filtered.map((o) => (
              <tr
                key={o.id}
                style={{ borderTop: "1px solid var(--content-border)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "var(--content-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "transparent";
                }}
              >
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--vyne-accent, var(--vyne-purple))",
                  }}
                >
                  {o.orderNumber}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {o.customerName}
                  </div>
                  {o.customerEmail && (
                    <div
                      style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                    >
                      {o.customerEmail}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {formatRelativeTime(o.createdAt)}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  ${o.total.toLocaleString()}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <StatusBadge status={o.status} />
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {o.status === "draft" && (
                      <button
                        onClick={() => updateOrderStatus(o.id, "confirmed")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--status-info)",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "var(--status-info)",
                        }}
                      >
                        <Check size={10} /> Confirm
                      </button>
                    )}
                    {o.status === "confirmed" && (
                      <button
                        onClick={() => updateOrderStatus(o.id, "shipped")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "1px solid #F59E0B",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "var(--status-warning)",
                        }}
                      >
                        <Truck size={10} /> Ship
                      </button>
                    )}
                    {o.status === "shipped" && (
                      <button
                        onClick={() => updateOrderStatus(o.id, "delivered")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "1px solid #22C55E",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "var(--status-success)",
                        }}
                      >
                        <Check size={10} /> Deliver
                      </button>
                    )}
                    {(o.status === "draft" || o.status === "confirmed") && (
                      <button
                        onClick={() => updateOrderStatus(o.id, "cancelled")}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--content-border)",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "var(--text-secondary)",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Delete ${o.orderNumber}`}
                      onClick={() => {
                        if (
                          !confirm(
                            `Delete ${o.orderNumber}? You'll have 5 seconds to undo.`,
                          )
                        )
                          return;
                        const snapshot = { ...o };
                        undoableDelete({
                          label: `Deleted order â€” ${snapshot.orderNumber}`,
                          mutate: () =>
                            useOpsStore.getState().deleteOrder(snapshot.id),
                          restore: () =>
                            useOpsStore.getState().addOrder(snapshot),
                        });
                      }}
                      style={{
                        padding: "3px 6px",
                        borderRadius: 6,
                        border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.06)",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "var(--status-danger)",
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            No orders found
          </div>
        )}
      </div>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New Order"
        width={400}
      >
        <FormField label="Customer Name">
          <input
            id="order-cust"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            placeholder="Acme Ltd."
            style={inputStyle}
          />
        </FormField>
        <FormField label="Customer Email (optional)">
          <input
            id="order-email"
            type="email"
            value={form.customerEmail}
            onChange={(e) =>
              setForm({ ...form, customerEmail: e.target.value })
            }
            placeholder="orders@acme.com"
            style={inputStyle}
          />
        </FormField>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginBottom: 14,
          }}
        >
          Line items can be added after creating the order.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setNewOpen(false)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={createOrder}
            disabled={!form.customerName}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: form.customerName
                ? "var(--vyne-accent, var(--vyne-purple))"
                : "var(--content-border)",
              color: form.customerName ? "#fff" : "var(--text-tertiary)",
              cursor: form.customerName ? "pointer" : "default",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Create Order
          </button>
        </div>
      </Modal>
    </div>
  );
}

// â”€â”€â”€ Suppliers tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SuppliersTab({
  suppliers,
  setSuppliers,
}: Readonly<{
  suppliers: ERPSupplier[];
  setSuppliers: (s: ERPSupplier[]) => void;
}>) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
  });

  function addSupplier() {
    const s: ERPSupplier = { id: `s${Date.now()}`, ...form, status: "active" };
    setSuppliers([...suppliers, s]);
    erpApi.createSupplier(s).catch(() => {});
    setAddOpen(false);
    setForm({ name: "", contactName: "", email: "", phone: "" });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => router.push("/ops/suppliers/new")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Plus size={13} /> Add Supplier
        </button>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table
          className="m-cards"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              {["Supplier", "Contact", "Email", "Phone", "Status", ""].map(
                (h, i) => (
                  <th
                    key={h || `act-${i}`}
                    style={{
                      padding: "9px 14px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr
                key={s.id}
                style={{ borderTop: "1px solid var(--content-border)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "var(--content-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "transparent";
                }}
              >
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {s.name}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {s.contactName ?? "â€”"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {s.email ?? "â€”"}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {s.phone ?? "â€”"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <StatusBadge status={s.status ?? "active"} />
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  <button
                    type="button"
                    aria-label={`Delete ${s.name}`}
                    onClick={() => {
                      if (
                        !confirm(
                          `Delete ${s.name}? You'll have 5 seconds to undo.`,
                        )
                      )
                        return;
                      const snapshot = { ...s };
                      undoableDelete({
                        label: `Deleted supplier â€” ${snapshot.name}`,
                        mutate: () =>
                          useOpsStore.getState().deleteSupplier(snapshot.id),
                        restore: () =>
                          useOpsStore.getState().addSupplier(snapshot),
                      });
                    }}
                    style={{
                      padding: "3px 6px",
                      borderRadius: 6,
                      border: "1px solid rgba(239,68,68,0.25)",
                      background: "rgba(239,68,68,0.06)",
                      cursor: "pointer",
                      fontSize: 11,
                      color: "var(--status-danger)",
                    }}
                  >
                    <X size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Supplier"
        width={420}
      >
        <FormField label="Company Name">
          <input
            id="sup-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Acme Supplies Ltd."
            style={inputStyle}
          />
        </FormField>
        <FormField label="Contact Name">
          <input
            id="sup-contact"
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            placeholder="Jane Smith"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Email">
          <input
            id="sup-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@acme.com"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Phone">
          <input
            id="sup-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 415 555 0100"
            style={inputStyle}
          />
        </FormField>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <button
            onClick={() => setAddOpen(false)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={addSupplier}
            disabled={!form.name}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: form.name
                ? "var(--vyne-accent, var(--vyne-purple))"
                : "var(--content-border)",
              color: form.name ? "#fff" : "var(--text-tertiary)",
              cursor: form.name ? "pointer" : "default",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Add Supplier
          </button>
        </div>
      </Modal>
    </div>
  );
}

// â”€â”€â”€ Manufacturing tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ManufacturingTab({
  boms,
  workOrders,
  setWorkOrders,
  products,
}: Readonly<{
  boms: ERPBOM[];
  workOrders: ERPWorkOrder[];
  setWorkOrders: (w: ERPWorkOrder[]) => void;
  products: ERPProduct[];
}>) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<"boms" | "work-orders" | "flowchart">(
    "boms",
  );
  const [flowchartProductId, setFlowchartProductId] =
    useState<string>("p-macbook");
  const [bomDetail, setBomDetail] = useState<ERPBOM | null>(null);
  const [newWOOpen, setNewWOOpen] = useState(false);
  const [woForm, setWoForm] = useState({ productName: "", qtyToProduce: "" });

  function createWorkOrder() {
    const wo: ERPWorkOrder = {
      id: `w${Date.now()}`,
      productName: woForm.productName,
      qtyToProduce: Number.parseInt(woForm.qtyToProduce) || 0,
      status: "planned",
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
    };
    setWorkOrders([...workOrders, wo]);
    erpApi.createWorkOrder(wo).catch(() => {});
    setNewWOOpen(false);
    setWoForm({ productName: "", qtyToProduce: "" });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <TabBtn
          label="Bills of Materials"
          active={subTab === "boms"}
          onClick={() => setSubTab("boms")}
        />
        <TabBtn
          label="BOM Flowchart"
          active={subTab === "flowchart"}
          onClick={() => setSubTab("flowchart")}
        />
        <TabBtn
          label="Work Orders"
          active={subTab === "work-orders"}
          onClick={() => setSubTab("work-orders")}
        />
      </div>

      {subTab === "flowchart" &&
        (() => {
          const root =
            DEMO_BOM_TREES.find((t) => t.id === flowchartProductId) ??
            DEMO_BOM_TREES[0];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <label
                  htmlFor="bom-product-select"
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Show BOM tree for:
                </label>
                <select
                  id="bom-product-select"
                  value={flowchartProductId}
                  onChange={(e) => setFlowchartProductId(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: "5px 9px",
                    borderRadius: 8,
                    border: "1px solid var(--content-border)",
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                    minWidth: 220,
                  }}
                >
                  {DEMO_BOM_TREES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.sku}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Top-down: final product â†’ direct components â†’
                  sub-components â†’ raw materials. Costs roll up to the parent
                  at every level.
                </span>
              </div>
              <BOMFlowchart root={root} />
            </div>
          );
        })()}

      {subTab === "boms" && (
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table
            className="m-cards"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "var(--table-header-bg)" }}>
                {[
                  "Product",
                  "Version",
                  "Components",
                  "Unit cost",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 14px",
                      textAlign: "left",
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
              {boms.map((b) => (
                <tr
                  key={b.id}
                  style={{ borderTop: "1px solid var(--content-border)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "var(--content-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "transparent";
                  }}
                >
                  <td
                    style={{
                      padding: "10px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {b.productName}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    v{b.version}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {b.components?.length ?? 0} components
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {(() => {
                      const cost = computeBomCost(b, products);
                      const product = products.find(
                        (p) => p.id === b.productId,
                      );
                      const target = product?.costPrice ?? 0;
                      const delta = target > 0 ? cost - target : 0;
                      return (
                        <>
                          ${cost.toLocaleString()}
                          {target > 0 && Math.abs(delta) > 0.01 && (
                            <span
                              title={`Stored cost ${`$${target.toLocaleString()}`}; rollup ${delta > 0 ? "+" : ""}${`$${delta.toFixed(2)}`}`}
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                fontWeight: 700,
                                color:
                                  delta > 0
                                    ? "var(--status-danger)"
                                    : "var(--status-success)",
                              }}
                            >
                              {delta > 0 ? "â–²" : "â–¼"}{" "}
                              {Math.abs(delta).toFixed(0)}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setBomDetail(b)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--content-border)",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "var(--text-secondary)",
                        }}
                      >
                        View BOM
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${b.productName ?? "BOM"}`}
                        onClick={() => {
                          if (
                            !confirm(
                              `Delete this BOM? You'll have 5 seconds to undo.`,
                            )
                          )
                            return;
                          const snapshot = { ...b };
                          undoableDelete({
                            label: `Deleted BOM â€” ${snapshot.productName ?? "BOM"}`,
                            mutate: () =>
                              useOpsStore.getState().deleteBom(snapshot.id),
                            restore: () =>
                              useOpsStore.getState().addBom(snapshot),
                          });
                        }}
                        style={{
                          padding: "3px 6px",
                          borderRadius: 6,
                          border: "1px solid rgba(239,68,68,0.25)",
                          background: "rgba(239,68,68,0.06)",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "var(--status-danger)",
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "work-orders" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 10,
            }}
          >
            <button
              onClick={() => router.push("/ops/work-orders/new")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <Plus size={13} /> New Work Order
            </button>
          </div>
          <div
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <table
              className="m-cards"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ background: "var(--table-header-bg)" }}>
                  {[
                    "Product",
                    "Qty to Produce",
                    "Status",
                    "Scheduled",
                    "Due Date",
                    "",
                  ].map((h, idx) => (
                    <th
                      key={h || `act-${idx}`}
                      style={{
                        padding: "9px 14px",
                        textAlign: "left",
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
                {workOrders.map((w) => (
                  <tr
                    key={w.id}
                    style={{ borderTop: "1px solid var(--content-border)" }}
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "var(--content-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "transparent";
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 14px",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {w.productName}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {w.qtyToProduce}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <StatusBadge status={w.status} />
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {w.scheduledDate
                        ? new Date(w.scheduledDate).toLocaleDateString()
                        : "â€”"}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {w.dueDate
                        ? new Date(w.dueDate).toLocaleDateString()
                        : "â€”"}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <button
                        type="button"
                        aria-label={`Delete ${w.productName ?? "work order"}`}
                        onClick={() => {
                          if (
                            !confirm(
                              `Delete this work order? You'll have 5 seconds to undo.`,
                            )
                          )
                            return;
                          const snapshot = { ...w };
                          undoableDelete({
                            label: `Deleted work order â€” ${snapshot.productName ?? "WO"}`,
                            mutate: () =>
                              useOpsStore
                                .getState()
                                .deleteWorkOrder(snapshot.id),
                            restore: () =>
                              useOpsStore.getState().addWorkOrder(snapshot),
                          });
                        }}
                        style={{
                          padding: "3px 6px",
                          borderRadius: 6,
                          border: "1px solid rgba(239,68,68,0.25)",
                          background: "rgba(239,68,68,0.06)",
                          cursor: "pointer",
                          fontSize: 11,
                          color: "var(--status-danger)",
                        }}
                      >
                        <X size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <WorkOrderGantt workOrders={workOrders} />
          </div>

          <Modal
            open={newWOOpen}
            onClose={() => setNewWOOpen(false)}
            title="New Work Order"
            width={380}
          >
            <FormField label="Product">
              <input
                id="wo-prod"
                value={woForm.productName}
                onChange={(e) =>
                  setWoForm({ ...woForm, productName: e.target.value })
                }
                placeholder="iPhone 16 Pro"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Quantity to Produce">
              <input
                id="wo-qty"
                type="number"
                value={woForm.qtyToProduce}
                onChange={(e) =>
                  setWoForm({ ...woForm, qtyToProduce: e.target.value })
                }
                placeholder="100"
                style={inputStyle}
              />
            </FormField>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 4,
              }}
            >
              <button
                onClick={() => setNewWOOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--input-border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={createWorkOrder}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--vyne-accent, var(--vyne-purple))",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Create
              </button>
            </div>
          </Modal>
        </div>
      )}

      {/* BOM detail modal */}
      <Modal
        open={!!bomDetail}
        onClose={() => setBomDetail(null)}
        title={`BOM â€” ${bomDetail?.productName}`}
        width={440}
      >
        <div
          style={{
            marginBottom: 12,
            fontSize: 11,
            color: "var(--text-secondary)",
          }}
        >
          Version {bomDetail?.version}
        </div>
        <div
          style={{
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <table
            className="m-cards"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "var(--table-header-bg)" }}>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                  }}
                >
                  Component
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                  }}
                >
                  UOM
                </th>
              </tr>
            </thead>
            <tbody>
              {bomDetail?.components?.map((c) => (
                <tr
                  key={c.componentId}
                  style={{ borderTop: "1px solid var(--content-border)" }}
                >
                  <td
                    style={{
                      padding: "9px 12px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                    }}
                  >
                    {c.componentName}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      textAlign: "right",
                    }}
                  >
                    {c.quantity}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {c.uom}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}

// â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function OpsPage() {
  return (
    <Suspense fallback={null}>
      <OpsPageInner />
    </Suspense>
  );
}

function OpsPageInner() {
  const [tab, setTab] = useState<
    | "dashboard"
    | "overview"
    | "inventory"
    | "orders"
    | "suppliers"
    | "manufacturing"
  >("overview");

  // Honour ?view=dashboard from sidebar.
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");
  useEffect(() => {
    if (
      urlView === "dashboard" ||
      urlView === "overview" ||
      urlView === "inventory" ||
      urlView === "orders" ||
      urlView === "suppliers" ||
      urlView === "manufacturing"
    ) {
      setTab(urlView);
    }
  }, [urlView]);
  const [products, setProducts] = useState<ERPProduct[]>(MOCK_PRODUCTS);
  const [orders, setOrders] = useState<ERPOrder[]>(MOCK_ORDERS);
  const [suppliers, setSuppliers] = useState<ERPSupplier[]>(MOCK_SUPPLIERS);
  const [boms] = useState<ERPBOM[]>(MOCK_BOMS);
  const [workOrders, setWorkOrders] =
    useState<ERPWorkOrder[]>(MOCK_WORK_ORDERS);

  // Load real data if API available
  useEffect(() => {
    erpApi
      .listProducts()
      .then((r) => setProducts(r.data))
      .catch(() => {});
    erpApi
      .listOrders()
      .then((r) => setOrders(r.data))
      .catch(() => {});
    erpApi
      .listSuppliers()
      .then((r) => setSuppliers(r.data))
      .catch(() => {});
  }, []);

  const tabs: Array<{ id: typeof tab; label: string; icon: React.ReactNode }> =
    [
      { id: "dashboard", label: "Dashboard", icon: <TrendingUp size={13} /> },
      { id: "overview", label: "Overview", icon: <TrendingUp size={13} /> },
      { id: "inventory", label: "Inventory", icon: <Package size={13} /> },
      { id: "orders", label: "Orders", icon: <ShoppingCart size={13} /> },
      { id: "suppliers", label: "Suppliers", icon: <Truck size={13} /> },
      {
        id: "manufacturing",
        label: "Manufacturing",
        icon: <Factory size={13} />,
      },
    ];

  const dash = usePageDashboard("ops", "30d");
  const aiPrompts = useAiSuggestedPrompts();
  useRegisterAiCommands("ops");

  // Real KPIs from current data
  const lowStockCount = products.filter((p) => p.status === "low_stock").length;
  const outOfStockCount = products.filter(
    (p) => p.status === "out_of_stock",
  ).length;
  const inventoryValue = products.reduce(
    (s, p) => s + p.stockQty * (p.price ?? 0),
    0,
  );
  const pendingOrders = orders.filter(
    (o) => o.status === "confirmed" || o.status === "draft",
  ).length;
  const totalOrderValue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const activeWOs = workOrders.filter(
    (w) => w.status === "in_progress" || w.status === "planned",
  ).length;

  // 14-day order revenue sparkline
  const orderSparkline = (() => {
    const buckets = Array.from({ length: 14 }, () => 0);
    const now = Date.now();
    for (const o of orders) {
      const t = new Date(o.createdAt ?? "").getTime();
      if (Number.isNaN(t)) continue;
      const daysAgo = Math.floor((now - t) / 86400000);
      if (daysAgo < 0 || daysAgo >= 14) continue;
      buckets[13 - daysAgo] += o.total ?? 0;
    }
    return buckets;
  })();

  useRegisterCommands("ops", [
    {
      id: "ops-new-product",
      label: "Add product",
      icon: <Plus size={14} />,
      action: () => setTab("inventory"),
    },
    {
      id: "ops-new-order",
      label: "New order",
      icon: <ShoppingCart size={14} />,
      action: () => setTab("orders"),
    },
    {
      id: "ops-low-stock",
      label: "View low-stock items",
      icon: <AlertTriangle size={14} />,
      action: () => setTab("inventory"),
      keywords: "reorder threshold",
    },
    {
      id: "ops-suppliers",
      label: "Open suppliers",
      icon: <Truck size={14} />,
      action: () => setTab("suppliers"),
    },
  ]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <DemoDataBanner
        moduleName="Operations"
        ctaLabel="Ask Vyne how to import"
        ctaHref="/ai/chat?prompt=How%20do%20I%20import%20my%20inventory%20and%20orders%20into%20VYNE%3F"
      />
      <PageHeader
        icon={<Package size={16} />}
        title="Operations"
        subtitle="ERP · Inventory · Manufacturing · Orders"
        actions={
          <>
            <Pill tone="warn" dot>
              {products.filter((p) => p.status !== "in_stock").length} low stock
            </Pill>
            <Pill tone="info" dot>
              {orders.filter((o) => o.status === "confirmed").length} pending
            </Pill>
            <AskAiButton noun="ops" suggestions={aiPrompts} />
            <ExportButton
              data={
                tab === "orders"
                  ? (orders as unknown as Record<string, unknown>[])
                  : (products as unknown as Record<string, unknown>[])
              }
              filename={tab === "orders" ? "vyne-orders" : "vyne-inventory"}
              audit={{
                noun: tab === "orders" ? "ops-orders" : "ops-products",
                viewName: tab,
                filters: {},
              }}
              columns={
                tab === "orders"
                  ? [
                      { key: "orderNumber", header: "Order #" },
                      { key: "customerName", header: "Customer" },
                      { key: "status", header: "Status" },
                      { key: "total", header: "Total" },
                      { key: "createdAt", header: "Date" },
                    ]
                  : [
                      { key: "name", header: "Product" },
                      { key: "sku", header: "SKU" },
                      { key: "price", header: "Price" },
                      { key: "costPrice", header: "Cost" },
                      { key: "stockQty", header: "Stock Qty" },
                      { key: "categoryName", header: "Category" },
                      { key: "status", header: "Status" },
                    ]
              }
            />
          </>
        }
      />
      <PageDashboard
        storageKey="ops"
        range={dash.range}
        onRangeChange={dash.setRange}
        kpis={[
          {
            label: "SKUs",
            value: products.length.toString(),
            hint: `${products.filter((p) => p.status === "in_stock").length} in stock`,
          },
          {
            label: "Low stock",
            value: lowStockCount.toString(),
            goodWhenUp: false,
            hint: lowStockCount > 0 ? "needs reorder" : "all healthy",
          },
          {
            label: "Out of stock",
            value: outOfStockCount.toString(),
            goodWhenUp: false,
          },
          {
            label: "Inventory value",
            value: `$${(inventoryValue / 1000).toFixed(1)}k`,
          },
          {
            label: "Pending orders",
            value: pendingOrders.toString(),
            sparkline: orderSparkline,
            hint: `$${(totalOrderValue / 1000).toFixed(1)}k total`,
          },
          {
            label: "Active WOs",
            value: activeWOs.toString(),
            hint: `${workOrders.length} total`,
          },
        ]}
      />

      <div
        style={{
          padding: "8px 20px 0",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                background: "transparent",
                color:
                  tab === id
                    ? "var(--vyne-accent, var(--vyne-purple))"
                    : "var(--text-secondary)",
                borderBottom:
                  tab === id ? "2px solid #06B6D4" : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        className="content-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: tab === "dashboard" ? 0 : 20,
        }}
      >
        {tab === "dashboard" && <OpsDashboardView />}
        {tab === "overview" && (
          <OverviewTab products={products} orders={orders} />
        )}
        {tab === "inventory" && (
          <InventoryTab products={products} setProducts={setProducts} />
        )}
        {tab === "orders" && (
          <OrdersTab orders={orders} setOrders={setOrders} />
        )}
        {tab === "suppliers" && (
          <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} />
        )}
        {tab === "manufacturing" && (
          <ManufacturingTab
            boms={boms}
            workOrders={workOrders}
            setWorkOrders={setWorkOrders}
            products={products}
          />
        )}
      </div>
    </div>
  );
}
