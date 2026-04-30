"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { VyneLogo } from "@/components/brand/VyneLogo";

// ── Admin nav item ──────────────────────────────────────────────
function AdminNavItem({
  icon,
  label,
  href,
  active,
}: Readonly<{
  icon: string;
  label: string;
  href: string;
  active: boolean;
}>) {
  const [hovered, setHovered] = useState(false);

  let color = "rgba(255,255,255,0.5)";
  if (active) color = "#fff";
  else if (hovered) color = "rgba(255,255,255,0.8)";

  let bg = "transparent";
  if (active) bg = "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.22)";
  else if (hovered) bg = "rgba(255,255,255,0.06)";

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color,
        background: bg,
        textDecoration: "none",
        transition: "all 0.15s",
        marginBottom: 2,
        position: "relative",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 20,
            borderRadius: "0 3px 3px 0",
            background: "var(--vyne-accent, #06B6D4)",
          }}
        />
      )}
      <span
        style={{ fontSize: 15, width: 22, textAlign: "center", flexShrink: 0 }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

// ── Vyne Admin Logo (uses the shared VyneLogo mark) ────────────
function VyneAdminLogo() {
  return <VyneLogo variant="mark" markSize={24} />;
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [backHovered, setBackHovered] = useState(false);

  const navItems = [
    { icon: "📊", label: "Dashboard", href: "/admin" },
    { icon: "🏢", label: "Tenants", href: "/admin/tenants" },
    { icon: "💳", label: "Billing", href: "/admin/billing" },
    { icon: "🖥", label: "System Health", href: "/admin/system" },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F1A", display: "flex" }}>
      {/* ── Left sidebar ──────────────────────────── */}
      <aside
        style={{
          width: 240,
          minWidth: 240,
          background: "#1C1C2E",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        {/* Header with gradient */}
        <div
          style={{
            padding: "20px 18px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background:
              "linear-gradient(135deg, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.15) 0%, rgba(139,104,255,0.08) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <VyneAdminLogo />
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg, #A5F3FC, #8B68FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Vyne Admin
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 1,
                }}
              >
                Platform Management
              </div>
            </div>
          </div>
          <span
            style={{
              display: "inline-block",
              marginTop: 10,
              fontSize: 9,
              fontWeight: 700,
              color: "var(--vyne-accent, #06B6D4)",
              background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18)",
              padding: "2px 8px",
              borderRadius: 4,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            INTERNAL
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "12px 10px", flex: 1, overflowY: "auto" }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.1em",
              padding: "4px 14px 8px",
              textTransform: "uppercase",
            }}
          >
            Navigation
          </div>
          {navItems.map((item) => (
            <AdminNavItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Back to main app */}
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Link
            href="/home"
            onMouseEnter={() => setBackHovered(true)}
            onMouseLeave={() => setBackHovered(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: backHovered ? "rgba(255,255,255,0.8)" : "#9090B0",
              textDecoration: "none",
              padding: "9px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: backHovered
                ? "rgba(255,255,255,0.04)"
                : "transparent",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 14 }}>&#8592;</span>
            <span>Back to App</span>
          </Link>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
