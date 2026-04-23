"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Shared sub-nav tab bar for Project Management pages.
 * Renders: Projects · Tasks · Sub Tasks · Teams
 */
const TABS: Array<{ label: string; href: string; match: RegExp }> = [
  { label: "Projects", href: "/projects", match: /^\/projects(\/|$)(?!tasks|subtasks|teams)/ },
  { label: "Tasks", href: "/projects/tasks", match: /^\/projects\/tasks(\/|$)/ },
  { label: "Sub Tasks", href: "/projects/subtasks", match: /^\/projects\/subtasks(\/|$)/ },
  { label: "Teams", href: "/projects/teams", match: /^\/projects\/teams(\/|$)/ },
];

export function ProjectsSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Project Management sections"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "10px 20px 0",
        borderBottom: "1px solid var(--content-border)",
        background: "var(--content-bg)",
      }}
    >
      {TABS.map((t) => {
        const active = t.match.test(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "10px 14px",
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              color: active ? "var(--vyne-teal)" : "var(--text-secondary)",
              borderBottom: active
                ? "2px solid var(--vyne-teal)"
                : "2px solid transparent",
              marginBottom: -1,
              textDecoration: "none",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
