"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useMounted } from "@/hooks/useMounted";
import { haptics } from "@/lib/haptics";

interface FabAction {
  label: string;
  href: string;
}

// Per-route mapping of "what does + mean here". null = hide the FAB.
function pickAction(pathname: string): FabAction | null {
  if (pathname.startsWith("/projects")) return { label: "New project", href: "/projects/new" };
  if (pathname.startsWith("/crm")) return { label: "New deal", href: "/crm?new=1" };
  if (pathname.startsWith("/contacts")) return { label: "New contact", href: "/contacts/people/new" };
  if (pathname.startsWith("/ops")) return { label: "New product", href: "/ops/products/new" };
  if (pathname.startsWith("/manufacturing")) return { label: "New work order", href: "/ops/work-orders/new" };
  if (pathname.startsWith("/sales")) return { label: "New quote", href: "/sales/quotes/new" };
  if (pathname.startsWith("/invoicing") || pathname.startsWith("/finance")) return { label: "New invoice", href: "/invoicing?new=1" };
  if (pathname.startsWith("/hr")) return { label: "New employee", href: "/hr?new=1" };
  if (pathname.startsWith("/chat")) return { label: "New channel", href: "/chat?new=1" };
  if (pathname.startsWith("/ai")) return { label: "New AI chat", href: "/ai/chat?new=1" };
  return null;
}

/**
 * Floating "+" action button — only renders ≤768px. The action target
 * follows the current route. Sits above the MobileBottomNav with a
 * small safe-area offset so it never collides with the home indicator.
 */
export function MobileFAB() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const mounted = useMounted();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!mounted || !isMobile) return null;
  const action = pickAction(pathname);
  if (!action) return null;

  return (
    <button
      type="button"
      aria-label={action.label}
      onClick={() => {
        haptics.tick();
        router.push(action.href);
      }}
      style={{
        position: "fixed",
        right: "calc(16px + env(safe-area-inset-right, 0px))",
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        zIndex: 75,
        width: 52,
        height: 52,
        borderRadius: 999,
        border: "none",
        background: "var(--vyne-purple, #5B5BD6)",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(var(--vyne-accent-rgb, 91, 91, 214), 0.45)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <Plus size={22} />
    </button>
  );
}
