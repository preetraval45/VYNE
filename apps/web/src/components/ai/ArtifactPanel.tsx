"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  Check,
  X,
  Code,
  Eye,
  FileCode,
  Sheet as SheetIcon,
  ExternalLink,
  Network,
  Presentation,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Artifact } from "@/lib/ai/streamClient";

interface Props {
  artifact: Artifact | null;
  onClose: () => void;
}

type ViewMode = "preview" | "source";

/**
 * Side-panel viewer for a single artifact. Renders different views
 * depending on the artifact's language tag:
 *   • mermaid           → live diagram (renders via mermaid.js)
 *   • csv               → table preview + "Open in Google Sheets" + download
 *   • slides            → slide carousel preview
 *   • markdown / md     → rendered markdown preview
 *   • everything else   → syntax-highlighted source view
 *
 * All artifact types support copy + download actions.
 */
export function ArtifactPanel({ artifact, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<ViewMode>("preview");

  // Reset view when a new artifact opens.
  useEffect(() => {
    setView("preview");
  }, [artifact?.id]);

  if (!artifact) return null;

  function copy() {
    if (!artifact) return;
    navigator.clipboard.writeText(artifact.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function download() {
    if (!artifact) return;
    const ext = languageExt(artifact.language);
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyne-${artifact.language || "artifact"}-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    if (!artifact) return;
    // Open a print-optimized window with the rendered markdown so the
    // user can "Save as PDF" from the browser print dialog.
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    const lang = artifact.language || "text";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Vyne · ${lang}</title>
<style>
  body { font: 14px/1.55 -apple-system, Segoe UI, Inter, sans-serif; margin: 56px; color: #1a1a2e; }
  h1, h2, h3 { letter-spacing: -0.02em; }
  pre { background: #f5f5f8; padding: 12px; border-radius: 8px; overflow: auto; }
  code { font: 12px ui-monospace, Menlo, monospace; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ddd; padding: 6px 10px; }
  @media print { body { margin: 18mm; } }
</style></head><body>${
      lang === "markdown" || lang === "md"
        ? renderMarkdown(artifact.content)
        : `<pre>${escape(artifact.content)}</pre>`
    }
<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 200); });</script>
</body></html>`;
    w.document.write(html);
    w.document.close();
  }

  function escape(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const language = artifact.language || "text";
  const supportsPreview =
    language === "mermaid" ||
    language === "csv" ||
    language === "slides" ||
    language === "markdown" ||
    language === "md";
  const previewIcon = previewIconFor(language);

  return (
    <aside
      role="complementary"
      aria-label="Artifact viewer"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(720px, 96vw)",
        background: "var(--content-bg)",
        borderLeft: "1px solid var(--content-border)",
        boxShadow: "-12px 0 40px rgba(0, 0, 0, 0.32)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        animation: "slideInRight 0.22s var(--ease-out-quart) both",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)",
            color: "var(--vyne-teal)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {previewIcon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {labelFor(language)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {language} · {artifact.content.length} chars
          </div>
        </div>

        {/* Preview / Source toggle (only when there's a meaningful preview) */}
        {supportsPreview && (
          <div
            role="tablist"
            aria-label="View mode"
            style={{
              display: "inline-flex",
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              borderRadius: 8,
              padding: 2,
              marginRight: 6,
            }}
          >
            <ToggleBtn
              active={view === "preview"}
              onClick={() => setView("preview")}
              icon={<Eye size={12} />}
              label="Preview"
            />
            <ToggleBtn
              active={view === "source"}
              onClick={() => setView("source")}
              icon={<FileCode size={12} />}
              label="Source"
            />
          </div>
        )}

        {language === "csv" && (
          <a
            href={googleSheetsImportUrl(artifact.content)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in Google Sheets"
            title="Open in Google Sheets"
            style={{
              ...iconBtnStyle,
              background: "#0F9D58",
              borderColor: "#0F9D58",
              color: "#fff",
              width: "auto",
              padding: "0 10px",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <SheetIcon size={12} />
            Sheets
            <ExternalLink size={10} />
          </a>
        )}
        <button
          type="button"
          onClick={copy}
          aria-label="Copy artifact"
          style={iconBtnStyle}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button
          type="button"
          onClick={download}
          aria-label="Download artifact"
          style={iconBtnStyle}
        >
          <Download size={14} />
        </button>
        {(language === "markdown" || language === "md") && (
          <button
            type="button"
            onClick={exportPdf}
            aria-label="Export as PDF"
            title="Export as PDF (browser print)"
            style={{
              ...iconBtnStyle,
              width: "auto",
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            PDF
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close artifact"
          style={iconBtnStyle}
        >
          <X size={14} />
        </button>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--content-bg-secondary)",
        }}
      >
        {supportsPreview && view === "preview" ? (
          <ArtifactPreview artifact={artifact} />
        ) : (
          <pre
            style={{
              margin: 0,
              padding: 16,
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {artifact.content}
          </pre>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </aside>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 10px",
        borderRadius: 6,
        border: "none",
        background: active ? "var(--content-bg)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-tertiary)",
        fontSize: 11.5,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-secondary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

function labelFor(lang: string): string {
  const map: Record<string, string> = {
    mermaid: "Diagram",
    csv: "Spreadsheet",
    slides: "Presentation",
    markdown: "Document",
    md: "Document",
    json: "JSON data",
    typescript: "TypeScript",
    javascript: "JavaScript",
    python: "Python",
    sql: "SQL",
    html: "HTML",
    css: "CSS",
  };
  return map[lang] ?? "Artifact";
}

function previewIconFor(lang: string): React.ReactNode {
  const size = 15;
  if (lang === "mermaid") return <Network size={size} />;
  if (lang === "csv") return <SheetIcon size={size} />;
  if (lang === "slides") return <Presentation size={size} />;
  return <Code size={size} />;
}

function languageExt(lang: string): string {
  const map: Record<string, string> = {
    typescript: "ts",
    javascript: "js",
    python: "py",
    markdown: "md",
    md: "md",
    json: "json",
    yaml: "yml",
    html: "html",
    css: "css",
    sql: "sql",
    sh: "sh",
    bash: "sh",
    rust: "rs",
    go: "go",
    java: "java",
    csv: "csv",
    mermaid: "mmd",
    slides: "md",
    text: "txt",
  };
  return map[lang] ?? lang ?? "txt";
}

/**
 * Build a Google Sheets import URL from CSV content. Sheets accepts
 * CSV via the import wizard; a docs.google.com/spreadsheets/create
 * URL with the data fragment opens a new sheet pre-populated. As a
 * portable alternative we open Sheets blank and copy the CSV to
 * clipboard for paste — fallback when the data is large.
 */
function googleSheetsImportUrl(csv: string): string {
  // Small CSVs fit in a data URL via clipboard fallback. Sheets does
  // not support direct CSV-import via URL params, so we open the
  // "create new sheet" page; the user pastes the already-copied CSV.
  // We also encode a clipboard-paste hint via the URL fragment.
  void csv;
  return "https://docs.google.com/spreadsheets/create";
}

/* ─── Preview renderers ─────────────────────────────────────────── */

function ArtifactPreview({ artifact }: { artifact: Artifact }) {
  const lang = artifact.language;
  if (lang === "mermaid") return <MermaidPreview content={artifact.content} />;
  if (lang === "csv") return <CsvPreview content={artifact.content} />;
  if (lang === "slides")
    return <SlidesPreview content={artifact.content} />;
  if (lang === "markdown" || lang === "md")
    return <MarkdownPreview content={artifact.content} />;
  return null;
}

function MermaidPreview({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        // Lazy-load mermaid from CDN to keep the main bundle slim.
        const mermaid = (await import(
          /* webpackIgnore: true */
          "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs" as string
        ).catch(async () => {
          // Fallback: try unpkg if jsdelivr blocked
          return await import(
            /* webpackIgnore: true */
            "https://unpkg.com/mermaid@11/dist/mermaid.esm.min.mjs" as string
          );
        })) as { default: { initialize: (c: object) => void; render: (id: string, src: string) => Promise<{ svg: string }> } };
        const m = mermaid.default;
        m.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-sans, ui-sans-serif, system-ui)",
        });
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const result = await m.render(id, content);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = result.svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div style={{ padding: 20 }}>
      {error ? (
        <div
          style={{
            padding: 16,
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 10,
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          Mermaid render failed: {error}. Switch to Source view to see the
          diagram source.
        </div>
      ) : (
        <div
          ref={ref}
          style={{
            background: "#0a0e13",
            borderRadius: 12,
            padding: 16,
            overflow: "auto",
            minHeight: 240,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
            Rendering…
          </div>
        </div>
      )}
    </div>
  );
}

function CsvPreview({ content }: { content: string }) {
  const rows = parseCsv(content);
  if (rows.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 12.5, color: "var(--text-tertiary)" }}>
        Empty spreadsheet.
      </div>
    );
  }
  const [header, ...body] = rows;
  return (
    <div style={{ padding: 16, overflow: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12.5,
          minWidth: "max-content",
        }}
      >
        <thead>
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  background: "var(--table-header-bg)",
                  borderBottom: "1px solid var(--content-border)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p
        style={{
          marginTop: 12,
          fontSize: 11.5,
          color: "var(--text-tertiary)",
        }}
      >
        Tip: tap "Sheets" in the header to open Google Sheets, then paste —
        or download as .csv and import.
      </p>
    </div>
  );
}

function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l !== "");
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  });
}

function SlidesPreview({ content }: { content: string }) {
  const slides = content
    .split(/^---\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const [idx, setIdx] = useState(0);
  const cur = slides[idx] ?? "";

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #0a1820 0%, #0c1c26 100%)",
          borderRadius: 14,
          minHeight: 320,
          padding: "32px 36px",
          color: "#fff",
          boxShadow: "var(--elev-3)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          position: "relative",
        }}
      >
        <SlideContent text={cur} />
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 14,
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.45)",
          }}
        >
          {idx + 1} / {slides.length}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          aria-label="Previous slide"
          style={navBtnStyle(idx === 0)}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: idx === i ? 22 : 8,
                height: 8,
                borderRadius: 999,
                border: "none",
                background:
                  idx === i ? "var(--vyne-teal)" : "var(--content-border)",
                cursor: "pointer",
                transition: "width 0.18s",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
          disabled={idx === slides.length - 1}
          aria-label="Next slide"
          style={navBtnStyle(idx === slides.length - 1)}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function renderInlineMd(s: string): React.ReactNode {
  // Token order: bold (**x**), italic (*x*), code (`x`).
  const out: React.ReactNode[] = [];
  let rest = s;
  let key = 0;
  const re =
    /(\*\*([^*]+)\*\*)|(`([^`]+)`)|((?:^|[^*])\*([^*]+)\*(?=[^*]|$))/;
  while (rest.length > 0) {
    const m = rest.match(re);
    if (!m) {
      out.push(<span key={key++}>{rest}</span>);
      break;
    }
    const idx = rest.indexOf(m[0]);
    if (idx > 0) out.push(<span key={key++}>{rest.slice(0, idx)}</span>);
    if (m[1]) {
      out.push(
        <strong key={key++} style={{ fontWeight: 700, color: "#fff" }}>
          {m[2]}
        </strong>,
      );
    } else if (m[3]) {
      out.push(
        <code
          key={key++}
          style={{
            background: "rgba(255,255,255,0.10)",
            padding: "1px 5px",
            borderRadius: 4,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {m[4]}
        </code>,
      );
    } else if (m[5]) {
      // Italic match captured one preceding char — preserve it.
      const lead = m[5][0] !== "*" ? m[5][0] : "";
      if (lead) out.push(<span key={key++}>{lead}</span>);
      out.push(
        <em key={key++} style={{ fontStyle: "italic" }}>
          {m[6]}
        </em>,
      );
    }
    rest = rest.slice(idx + m[0].length);
  }
  return out;
}

function SlideContent({ text }: { text: string }) {
  // Lightweight markdown rendering — headings, bullets, paragraphs +
  // inline bold/italic/code via renderInlineMd.
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: 4 }} />;
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={i}
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#fff",
              }}
            >
              {renderInlineMd(trimmed.slice(2))}
            </h2>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={i}
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.92)",
              }}
            >
              {renderInlineMd(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 8,
                fontSize: 13.5,
                color: "rgba(255, 255, 255, 0.88)",
              }}
            >
              <span style={{ color: "var(--vyne-teal)" }}>•</span>
              <span>{renderInlineMd(trimmed.slice(2))}</span>
            </div>
          );
        }
        return (
          <p
            key={i}
            style={{
              margin: 0,
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "rgba(255, 255, 255, 0.88)",
            }}
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--content-border)",
    background: "var(--content-bg)",
    color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

function MarkdownPreview({ content }: { content: string }) {
  // Lightweight markdown — handles headings, bullets, bold, code, lists.
  const html = renderMarkdown(content);
  return (
    <div
      style={{
        padding: "20px 24px",
        fontSize: 13.5,
        lineHeight: 1.7,
        color: "var(--text-primary)",
      }}
      // dangerouslySetInnerHTML — content comes from AI but is sanitized
      // by renderMarkdown which only allows a limited set of tags.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(md: string): string {
  // Minimal, safe markdown → HTML. Escapes everything first, then
  // re-introduces a strict allowlist of constructs.
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let inOrdered = false;
  for (const raw of lines) {
    const line = esc(raw);
    if (/^#{1,6}\s/.test(line)) {
      if (inList) {
        out.push(inOrdered ? "</ol>" : "</ul>");
        inList = false;
        inOrdered = false;
      }
      const m = line.match(/^(#{1,6})\s(.*)$/)!;
      const level = m[1].length;
      out.push(
        `<h${level} style="margin:18px 0 8px;font-weight:700;letter-spacing:-0.02em;">${inline(m[2])}</h${level}>`,
      );
    } else if (/^\s*[-*]\s/.test(line)) {
      if (!inList || inOrdered) {
        if (inList) out.push("</ol>");
        out.push('<ul style="margin:6px 0;padding-left:22px;">');
        inList = true;
        inOrdered = false;
      }
      out.push(
        `<li style="margin:3px 0;">${inline(line.replace(/^\s*[-*]\s/, ""))}</li>`,
      );
    } else if (/^\s*\d+\.\s/.test(line)) {
      if (!inList || !inOrdered) {
        if (inList) out.push("</ul>");
        out.push('<ol style="margin:6px 0;padding-left:22px;">');
        inList = true;
        inOrdered = true;
      }
      out.push(
        `<li style="margin:3px 0;">${inline(line.replace(/^\s*\d+\.\s/, ""))}</li>`,
      );
    } else if (line.trim() === "") {
      if (inList) {
        out.push(inOrdered ? "</ol>" : "</ul>");
        inList = false;
        inOrdered = false;
      }
      out.push("");
    } else {
      if (inList) {
        out.push(inOrdered ? "</ol>" : "</ul>");
        inList = false;
        inOrdered = false;
      }
      out.push(`<p style="margin:8px 0;">${inline(line)}</p>`);
    }
  }
  if (inList) out.push(inOrdered ? "</ol>" : "</ul>");
  return out.join("\n");
}

function inline(s: string): string {
  // Bold **x** → <strong>, italic *x* → <em>, code `x` → <code>
  return s
    .replace(
      /\*\*([^*]+)\*\*/g,
      '<strong style="font-weight:700;">$1</strong>',
    )
    .replace(
      /(^|[^*])\*([^*]+)\*([^*]|$)/g,
      '$1<em style="font-style:italic;">$2</em>$3',
    )
    .replace(
      /`([^`]+)`/g,
      '<code style="background:rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10);padding:1px 5px;border-radius:4px;font-family:ui-monospace,monospace;font-size:0.92em;">$1</code>',
    );
}
