"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_TITLES: Record<string, string> = {
  "/home": "Home",
  "/dashboard": "Dashboard",
  "/contacts": "Contacts",
  "/sales": "Sales",
  "/chat": "Chat",
  "/calendar": "Calendar",
  "/timeline": "Timeline",
  "/projects": "Projects",
  "/docs": "Docs",
  "/ops": "Ops / ERP",
  "/finance": "Finance",
  "/crm": "CRM",
  "/hr": "HR",
  "/expenses": "Expenses",
  "/marketing": "Marketing",
  "/reporting": "Reporting",
  "/code": "Code & DevOps",
  "/observe": "Observe",
  "/ai": "Vyne AI",
  "/ai/chat": "Vyne AI · Chat",
  "/automations": "Automations",
  "/maintenance": "Maintenance",
  "/invoicing": "Invoicing",
  "/roadmap": "Roadmap",
  "/timesheet": "Timesheet",
  "/activity": "Activity",
  "/download": "Download apps",
  "/help": "Help",
  "/playbooks": "CS Playbooks",
  "/training": "Training",
  "/runbooks": "DR Runbooks",
  "/settings": "Settings",
  "/admin": "Admin",
};

/**
 * Updates document.title on client-side route changes so each page
 * has a meaningful tab title instead of the static "VYNE — AI-native
 * Company OS". Picks the longest matching route prefix so deep links
 * like /projects/123/tasks/456 still get a sensible label.
 */
export function PageTitleSync() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const match = Object.keys(ROUTE_TITLES)
      .filter((p) => pathname === p || pathname.startsWith(p + "/"))
      .sort((a, b) => b.length - a.length)[0];
    const label = match ? ROUTE_TITLES[match] : null;
    document.title = label
      ? `${label} · VYNE`
      : "VYNE — AI-native Company OS";
  }, [pathname]);

  return null;
}
