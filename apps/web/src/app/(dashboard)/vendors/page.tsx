"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  X,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Receipt,
  Tag,
  FileText,
} from "lucide-react";
import { useInvoicingStore, type Vendor } from "@/lib/stores/invoicing";
import { useMounted } from "@/hooks/useMounted";

function money(n: number): string {
  return `$${(n ?? 0).toLocaleString()}`;
}

export default function VendorsPage() {
  const mounted = useMounted();
  const vendors = useInvoicingStore((s) => s.vendors);
  const deleteVendor = useInvoicingStore((s) => s.deleteVendor);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      [v.name, v.contact, v.email, v.category, v.phone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [vendors, search]);

  const totalOutstanding = useMemo(
    () => vendors.reduce((sum, v) => sum + (v.outstanding ?? 0), 0),
    [vendors],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--content-bg-secondary, var(--content-bg))",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "18px 24px 14px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(46, 204, 113, 0.12)",
              border: "1px solid rgba(46, 204, 113, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2ECC71",
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.015em",
              }}
            >
              Vendors
            </h1>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 12.5,
                color: "var(--text-tertiary)",
              }}
              suppressHydrationWarning
            >
              {mounted ? vendors.length : 0} vendors ·{" "}
              {mounted ? money(totalOutstanding) : "$0"} outstanding
            </p>
          </div>
        </div>
        <Link
          href="/invoicing/vendors/new?return=/vendors"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            padding: "0 14px",
            borderRadius: 8,
            background:
              "linear-gradient(135deg, var(--vyne-accent-light, #7c4dff) 0%, var(--vyne-accent, var(--vyne-purple)) 100%)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(124, 77, 255, 0.28)",
          }}
        >
          <Plus size={15} />
          New Vendor
        </Link>
      </header>

      {/* Toolbar */}
      <div
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
        }}
      >
        <div
          role="search"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 36,
            width: 320,
            maxWidth: "100%",
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--input-bg, var(--content-secondary))",
          }}
        >
          <Search size={14} style={{ color: "var(--text-tertiary)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors by name, contact, email, category…"
            aria-label="Search vendors"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              style={iconBtn}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 16px 24px" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "64px 24px",
              textAlign: "center",
              color: "var(--text-tertiary)",
            }}
          >
            <Building2
              size={32}
              style={{ margin: "0 auto 12px", opacity: 0.4 }}
            />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {vendors.length === 0 ? "No vendors yet" : "No matches"}
            </div>
            <div style={{ fontSize: 13 }}>
              {vendors.length === 0
                ? "Add your first vendor to track bills and payments."
                : "Try a different search term."}
            </div>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                {[
                  "Vendor",
                  "Contact",
                  "Category",
                  "Terms",
                  "Outstanding",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "Outstanding" ? "right" : "left",
                      padding: "10px 14px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-tertiary)",
                      borderBottom: "1px solid var(--content-border)",
                      background: "var(--content-secondary)",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelected(v)}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  <td style={tdStyle}>
                    <div
                      style={{ fontWeight: 600, color: "var(--text-primary)" }}
                    >
                      {v.name}
                    </div>
                    {v.email && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {v.email}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{v.contact || "—"}</td>
                  <td style={tdStyle}>{v.category || "—"}</td>
                  <td style={tdStyle}>{v.paymentTerms || "—"}</td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {money(v.outstanding)}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "2px 9px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          v.status === "Active"
                            ? "rgba(46, 204, 113, 0.12)"
                            : "var(--content-secondary)",
                        color:
                          v.status === "Active"
                            ? "#2ECC71"
                            : "var(--text-tertiary)",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            v.status === "Active"
                              ? "#2ECC71"
                              : "var(--text-tertiary)",
                        }}
                      />
                      {v.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button
                      type="button"
                      aria-label={`Delete ${v.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete vendor "${v.name}"?`)) return;
                        deleteVendor(v.id);
                        if (selected?.id === v.id) setSelected(null);
                      }}
                      style={iconBtn}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <VendorDetailDrawer
          vendor={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function VendorDetailDrawer({
  vendor,
  onClose,
}: {
  vendor: Vendor;
  onClose: () => void;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 80,
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${vendor.name} details`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          width: "min(420px, 92vw)",
          background: "var(--content-bg)",
          borderLeft: "1px solid var(--content-border)",
          boxShadow: "-12px 0 32px rgba(0,0,0,0.25)",
          zIndex: 81,
          display: "flex",
          flexDirection: "column",
          padding: 20,
          gap: 14,
          overflowY: "auto",
        }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {vendor.name}
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: 6,
                padding: "2px 9px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                background:
                  vendor.status === "Active"
                    ? "rgba(46, 204, 113, 0.12)"
                    : "var(--content-secondary)",
                color:
                  vendor.status === "Active"
                    ? "#2ECC71"
                    : "var(--text-tertiary)",
              }}
            >
              {vendor.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={iconBtn}
          >
            <X size={16} />
          </button>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <Stat label="Total purchased" value={money(vendor.totalPurchased)} />
          <Stat label="Outstanding" value={money(vendor.outstanding)} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <DetailRow
            icon={<Building2 size={14} />}
            label="Contact"
            value={vendor.contact}
          />
          <DetailRow
            icon={<Mail size={14} />}
            label="Email"
            value={vendor.email}
          />
          <DetailRow
            icon={<Phone size={14} />}
            label="Phone"
            value={vendor.phone}
          />
          <DetailRow
            icon={<Globe size={14} />}
            label="Website"
            value={vendor.website}
          />
          <DetailRow
            icon={<Tag size={14} />}
            label="Category"
            value={vendor.category}
          />
          <DetailRow
            icon={<Receipt size={14} />}
            label="Payment terms"
            value={vendor.paymentTerms}
          />
          <DetailRow
            icon={<FileText size={14} />}
            label="Tax ID / EIN"
            value={vendor.taxId}
          />
          <DetailRow
            icon={<MapPin size={14} />}
            label="Address"
            value={vendor.address}
          />
        </div>

        {vendor.notes && (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-tertiary)",
                marginBottom: 4,
              }}
            >
              Notes
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--text-secondary)",
              }}
            >
              {vendor.notes}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--content-border)",
      }}
    >
      <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
        {icon}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "var(--text-tertiary)",
          width: 110,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--text-primary)",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "11px 14px",
  fontSize: 13,
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--content-border)",
};

const iconBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  borderRadius: 6,
  cursor: "pointer",
};
