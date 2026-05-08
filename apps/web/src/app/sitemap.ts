import type { MetadataRoute } from "next";

// /sitemap.xml (UI_UPGRADE_PLAN.md 9.7).
// Lists every public marketing surface so search engines can discover
// + crawl them. Auth + dashboard routes are excluded (covered by
// robots.ts disallow).

const SITE_URL = "https://vyne.vercel.app";

const PUBLIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
}> = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/learn", priority: 0.8, changeFrequency: "weekly" },
  { path: "/changelog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/status", priority: 0.6, changeFrequency: "daily" },
  { path: "/developers", priority: 0.7, changeFrequency: "monthly" },
  { path: "/partners", priority: 0.5, changeFrequency: "monthly" },
  { path: "/download", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
