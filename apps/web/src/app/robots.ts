import type { MetadataRoute } from "next";

// /robots.txt (UI_UPGRADE_PLAN.md 9.7).
// Allow crawl on the public marketing surfaces; disallow auth + the
// in-app dashboard so search engines don't index session-protected
// pages they can't render.

const SITE_URL = "https://vyne.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/learn",
          "/developers",
          "/changelog",
          "/status",
          "/partners",
          "/download",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/home",
          "/crm",
          "/chat",
          "/projects",
          "/contacts",
          "/invoicing",
          "/ops",
          "/finance",
          "/expenses",
          "/hr",
          "/marketing",
          "/observe",
          "/code",
          "/automations",
          "/docs",
          "/settings",
          "/admin/",
          "/api/",
          "/login",
          "/signup",
          "/onboarding",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
