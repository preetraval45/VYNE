import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OGData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const CACHE = new Map<string, { data: OGData; expires: number }>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TIMEOUT_MS = 4500;

function pickMeta(html: string, prop: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = re.exec(html);
  return m ? decodeHtmlEntities(m[1]) : undefined;
}

function pickMetaReverse(html: string, prop: string): string | undefined {
  // <meta content="..." property="og:title">
  const re = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m = re.exec(html);
  return m ? decodeHtmlEntities(m[1]) : undefined;
}

function pickTitle(html: string): string | undefined {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return m ? decodeHtmlEntities(m[1].trim()) : undefined;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function isAllowedUrl(u: string): URL | null {
  try {
    const url = new URL(u);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    // Block private IPs to prevent SSRF
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  const allowed = isAllowedUrl(target);
  if (!allowed) {
    return NextResponse.json(
      { error: "url not allowed" },
      { status: 400 },
    );
  }
  const key = allowed.toString();
  const cached = CACHE.get(key);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(allowed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VyneBot/1.0; +https://vyne.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) {
      return NextResponse.json(
        { error: `fetch failed: ${res.status}` },
        { status: 502 },
      );
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) {
      return NextResponse.json(
        { url: key, title: allowed.hostname },
        { headers: { "Cache-Control": "public, max-age=3600" } },
      );
    }
    const html = (await res.text()).slice(0, 200_000); // cap to first 200KB
    const og: OGData = {
      url: key,
      title:
        pickMeta(html, "og:title") ??
        pickMetaReverse(html, "og:title") ??
        pickMeta(html, "twitter:title") ??
        pickTitle(html),
      description:
        pickMeta(html, "og:description") ??
        pickMetaReverse(html, "og:description") ??
        pickMeta(html, "twitter:description") ??
        pickMeta(html, "description"),
      image:
        pickMeta(html, "og:image") ??
        pickMetaReverse(html, "og:image") ??
        pickMeta(html, "twitter:image"),
      siteName:
        pickMeta(html, "og:site_name") ??
        pickMetaReverse(html, "og:site_name") ??
        allowed.hostname,
    };
    // Resolve relative image URL
    if (og.image && !/^https?:\/\//.test(og.image)) {
      try {
        og.image = new URL(og.image, allowed).toString();
      } catch {
        og.image = undefined;
      }
    }
    CACHE.set(key, { data: og, expires: Date.now() + TTL_MS });
    return NextResponse.json(og, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fetch error" },
      { status: 502 },
    );
  }
}
