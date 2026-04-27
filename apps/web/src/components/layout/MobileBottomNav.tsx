"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Calendar as CalendarIcon,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: Home,
    match: (p) => p === "/" || p === "/home",
  },
  {
    href: "/chat",
    label: "Chat",
    icon: MessageSquare,
    match: (p) => p.startsWith("/chat"),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarIcon,
    match: (p) => p.startsWith("/calendar"),
  },
  {
    href: "/ai/chat",
    label: "AI",
    icon: Sparkles,
    match: (p) => p.startsWith("/ai"),
  },
];

/**
 * Mobile-only bottom navigation bar (≤768px). Five tabs for the main flows
 * + a More button that opens the full sidebar. Hidden on desktop via CSS.
 */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const [openSidebar, setOpenSidebar] = useState(false);

  // Open the existing sidebar drawer when "More" is tapped.
  function toggleSidebar() {
    const nav = document.querySelector<HTMLElement>(".sidebar-nav");
    if (!nav) return;
    const next = nav.getAttribute("data-mobile-open") !== "true";
    nav.setAttribute("data-mobile-open", next ? "true" : "false");
    document.body.style.overflow = next ? "hidden" : "";
    setOpenSidebar(next);
  }

  // Close drawer state when route changes
  useEffect(() => {
    setOpenSidebar(false);
  }, [pathname]);

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Main navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 95,
        height: 60,
        background: "var(--content-bg)",
        borderTop: "1px solid var(--content-border)",
        display: "flex",
        alignItems: "stretch",
        boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.08)",
        // Safe area for phones with home indicator
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              textDecoration: "none",
              color: active
                ? "var(--vyne-purple)"
                : "var(--text-tertiary)",
              transition: "color 0.15s",
              position: "relative",
            }}
          >
            {active && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 3,
                  borderRadius: "0 0 3px 3px",
                  background: "var(--vyne-purple)",
                }}
              />
            )}
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            <span
              style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                letterSpacing: "-0.005em",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Open more menu"
        aria-expanded={openSidebar}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          color: openSidebar ? "var(--vyne-purple)" : "var(--text-tertiary)",
          transition: "color 0.15s",
        }}
      >
        <MoreHorizontal size={20} strokeWidth={openSidebar ? 2.4 : 2} />
        <span
          style={{
            fontSize: 10,
            fontWeight: openSidebar ? 700 : 500,
            letterSpacing: "-0.005em",
          }}
        >
          More
        </span>
      </button>
    </nav>
  );
}
