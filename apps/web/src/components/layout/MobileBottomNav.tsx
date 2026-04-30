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
import { useUnreadStore } from "@/lib/stores/unread";
import { useMounted } from "@/hooks/useMounted";
import { MobileMoreSheet } from "./MobileMoreSheet";

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
 * Mobile bottom navigation bar (≤768px and tablet portrait). Five tabs:
 * four primary modules + a "More" button that opens MobileMoreSheet — a
 * 4-column grid of every module so the user can reach any page without
 * the sliding sidebar drawer.
 */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close the sheet whenever the route changes (Link tap navigates).
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Mobile swipe-from-left-edge gesture opens the sheet.
  useEffect(() => {
    function onOpen() {
      setSheetOpen(true);
    }
    window.addEventListener("vyne:open-more", onOpen);
    return () => window.removeEventListener("vyne:open-more", onOpen);
  }, []);

  const mounted = useMounted();
  const rawUnread = useUnreadStore((s) =>
    Object.values(s.counts).reduce((a, b) => a + b, 0),
  );
  // Gate persist-derived state until after mount or React hydration #418 fires
  const chatUnread = mounted ? rawUnread : 0;

  return (
    <>
      <MobileMoreSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
      <nav
        className="mobile-bottom-nav"
        aria-label="Main navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          // Above page content; below the More sheet (z=85) and its
          // backdrop (z=80) so taps on the sheet always land correctly.
          zIndex: 70,
          height: 60,
          background: "var(--content-bg)",
          borderTop: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "stretch",
          boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.08)",
          // Safe area for phones with home indicator
          paddingBottom: "env(safe-area-inset-bottom, 0)",
          pointerEvents: "auto",
          touchAction: "manipulation",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          const badge =
            item.label === "Chat" && chatUnread > 0 ? chatUnread : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setSheetOpen(false)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                textDecoration: "none",
                color: active
                  ? "var(--vyne-accent, var(--vyne-purple))"
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
                    background: "var(--vyne-accent, var(--vyne-purple))",
                  }}
                />
              )}
              <div style={{ position: "relative" }}>
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {badge > 0 && (
                  <span
                    aria-label={`${badge} unread`}
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -8,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 8,
                      background: "#EF4444",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                      boxShadow: "0 0 0 2px var(--content-bg)",
                    }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
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
          onClick={() => setSheetOpen((v) => !v)}
          aria-label="Open all modules"
          aria-expanded={sheetOpen}
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
            color: sheetOpen
              ? "var(--vyne-accent, var(--vyne-purple))"
              : "var(--text-tertiary)",
            transition: "color 0.15s",
          }}
        >
          <MoreHorizontal size={20} strokeWidth={sheetOpen ? 2.4 : 2} />
          <span
            style={{
              fontSize: 10,
              fontWeight: sheetOpen ? 700 : 500,
              letterSpacing: "-0.005em",
            }}
          >
            More
          </span>
        </button>
      </nav>
    </>
  );
}
