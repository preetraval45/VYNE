"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

/**
 * Mobile-only sidebar drawer controller. Renders a floating hamburger
 * below 768px; toggles `data-mobile-open` on `.sidebar-nav` and renders
 * a backdrop. Auto-closes on route change.
 */
export function MobileSidebarToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Apply to the sidebar and body while open
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".sidebar-nav");
    if (nav) nav.setAttribute("data-mobile-open", open ? "true" : "false");
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="mobile-sidebar-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
