"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe } from "lucide-react";

interface OGData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const URL_RE =
  /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))/gi;

const cache = new Map<string, OGData | "fail">();
const inflight = new Map<string, Promise<OGData | "fail">>();

async function fetchPreview(url: string): Promise<OGData | "fail"> {
  if (cache.has(url)) return cache.get(url)!;
  if (inflight.has(url)) return inflight.get(url)!;
  const p = (async () => {
    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        cache.set(url, "fail");
        return "fail" as const;
      }
      const data = (await res.json()) as OGData;
      cache.set(url, data);
      return data;
    } catch {
      cache.set(url, "fail");
      return "fail" as const;
    } finally {
      inflight.delete(url);
    }
  })();
  inflight.set(url, p);
  return p;
}

export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_RE);
  return matches ? Array.from(new Set(matches)) : [];
}

export function LinkPreviews({ text }: { readonly text: string }) {
  const urls = extractUrls(text).slice(0, 2); // cap to 2 per message
  if (urls.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginTop: 6,
      }}
    >
      {urls.map((u) => (
        <SingleLinkPreview key={u} url={u} />
      ))}
    </div>
  );
}

function SingleLinkPreview({ url }: { readonly url: string }) {
  const [data, setData] = useState<OGData | "fail" | null>(null);

  useEffect(() => {
    let active = true;
    fetchPreview(url).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [url]);

  if (data === null) {
    return (
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--content-border)",
          background: "var(--content-secondary)",
          fontSize: 11,
          color: "var(--text-tertiary)",
          maxWidth: 480,
        }}
      >
        Loading preview…
      </div>
    );
  }
  if (data === "fail") return null;

  let host = "";
  try {
    host = new URL(data.url).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        gap: 12,
        padding: 10,
        borderRadius: 10,
        border: "1px solid var(--content-border)",
        borderLeft: "3px solid var(--vyne-accent, var(--vyne-purple))",
        background: "var(--content-secondary)",
        color: "var(--text-primary)",
        textDecoration: "none",
        maxWidth: 520,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background =
          "rgba(108, 71, 255, 0.06)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background =
          "var(--content-secondary)")
      }
    >
      {data.image && (
        <img
          src={data.image}
          alt=""
          loading="lazy"
          style={{
            width: 80,
            height: 80,
            objectFit: "cover",
            borderRadius: 7,
            flexShrink: 0,
            background: "var(--content-bg)",
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            color: "var(--text-tertiary)",
            marginBottom: 3,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <Globe size={9} />
          {data.siteName || host}
          <ExternalLink size={9} style={{ marginLeft: "auto" }} />
        </div>
        {data.title && (
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.35,
              marginBottom: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {data.title}
          </div>
        )}
        {data.description && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-secondary)",
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {data.description}
          </div>
        )}
      </div>
    </a>
  );
}
