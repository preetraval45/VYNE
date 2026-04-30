"use client";

import { GitPullRequest, ExternalLink, Figma, CheckCircle2, Circle } from "lucide-react";

interface DetectedLink {
  type: "github-pr" | "linear" | "figma" | "generic";
  url: string;
  title: string;
  subtitle?: string;
  status?: string;
  statusColor?: string;
}

const PATTERNS = [
  {
    re: /https?:\/\/github\.com\/([\w-]+)\/([\w.-]+)\/pull\/(\d+)/i,
    parse(m: RegExpExecArray): DetectedLink {
      return {
        type: "github-pr",
        url: m[0],
        title: `${m[1]}/${m[2]} · PR #${m[3]}`,
        subtitle: "GitHub pull request",
        status: "Open",
        statusColor: "#22C55E",
      };
    },
  },
  {
    re: /https?:\/\/linear\.app\/[\w-]+\/issue\/([A-Z]+-\d+)/i,
    parse(m: RegExpExecArray): DetectedLink {
      return {
        type: "linear",
        url: m[0],
        title: m[1],
        subtitle: "Linear issue",
        status: "In Progress",
        statusColor: "#3B82F6",
      };
    },
  },
  {
    re: /https?:\/\/(www\.)?figma\.com\/(?:file|design|board|make)\/([^/]+)\/([^/?#]+)/i,
    parse(m: RegExpExecArray): DetectedLink {
      return {
        type: "figma",
        url: m[0],
        title: decodeURIComponent(m[3].replace(/-/g, " ")),
        subtitle: "Figma design",
      };
    },
  },
];

export function detectLinks(text: string): DetectedLink[] {
  const out: DetectedLink[] = [];
  for (const { re, parse } of PATTERNS) {
    const g = new RegExp(re.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null) {
      out.push(parse(m));
      if (out.length >= 4) return out;
    }
  }
  return out;
}

export function LinkPreviewCard({ link }: { link: DetectedLink }) {
  const Icon =
    link.type === "github-pr"
      ? GitPullRequest
      : link.type === "linear"
        ? CheckCircle2
        : link.type === "figma"
          ? Figma
          : Circle;
  const accent =
    link.type === "github-pr"
      ? "#8B5CF6"
      : link.type === "linear"
        ? "#5E6AD2"
        : link.type === "figma"
          ? "#F24E1E"
          : "var(--vyne-teal)";
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid var(--content-border)",
        background: "var(--content-bg-secondary)",
        textDecoration: "none",
        color: "var(--text-primary)",
        marginTop: 6,
        maxWidth: 380,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: `${accent}1A`,
          color: accent,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {link.title}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {link.subtitle}
        </span>
      </span>
      {link.status && (
        <span
          style={{
            fontSize: 10.5,
            padding: "2px 7px",
            borderRadius: 999,
            background: `${link.statusColor}1A`,
            color: link.statusColor,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {link.status}
        </span>
      )}
      <ExternalLink size={12} style={{ color: "var(--text-tertiary)" }} />
    </a>
  );
}
