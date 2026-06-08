import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Route-coverage guard (master plan Phase A1 "Done when").
 *
 * Asserts that every destination the left sidebar advertises actually resolves —
 * either to a real `page.tsx` route, or to a `next.config` redirect. Catches the
 * "404 hole" class of bug where nav links to a path that was never built.
 *
 * Pure static analysis (reads source files) so it runs in CI without a server.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, ".."); // src/
const APP_DIR = join(SRC, "app");
const SIDEBAR = join(SRC, "components", "layout", "Sidebar.tsx");
const NEXT_CONFIG = join(SRC, "..", "next.config.ts");

/** Collect every static route path from `app/**` page files. Route groups
 *  `(x)` contribute nothing to the URL; dynamic `[x]` segments are kept. */
function collectRoutes(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      const seg = name.startsWith("(") && name.endsWith(")") ? "" : `/${name}`;
      out.push(...collectRoutes(full, base + seg));
    } else if (/^page\.(tsx?|jsx?|mdx)$/.test(name)) {
      out.push(base === "" ? "/" : base);
    }
  }
  return out;
}

function extractQuoted(src: string, key: string): string[] {
  const re = new RegExp(`${key}:\\s*["'\`]([^"'\`]+)["'\`]`, "g");
  return [...src.matchAll(re)].map((m) => m[1]);
}

describe("route coverage — no advertised nav href 404s", () => {
  const routeSet = new Set(collectRoutes(APP_DIR));
  const sidebarSrc = readFileSync(SIDEBAR, "utf8");
  const nextConfigSrc = readFileSync(NEXT_CONFIG, "utf8");

  const redirectSources = new Set(extractQuoted(nextConfigSrc, "source"));

  // Every `href: "..."` in the sidebar nav definition that is an internal path.
  const navHrefs = [...new Set(extractQuoted(sidebarSrc, "href"))].filter((h) =>
    h.startsWith("/"),
  );

  function resolves(href: string): boolean {
    const pathname = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
    return routeSet.has(pathname) || redirectSources.has(pathname);
  }

  it("finds a non-trivial number of nav links to check", () => {
    expect(navHrefs.length).toBeGreaterThan(20);
  });

  it("resolves every sidebar nav destination to a page or a redirect", () => {
    const unresolved = navHrefs.filter((h) => !resolves(h));
    expect(
      unresolved,
      `Sidebar links with no matching page route or next.config redirect:\n` +
        unresolved.map((h) => `  • ${h}`).join("\n"),
    ).toEqual([]);
  });
});
