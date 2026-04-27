"use client";

import React from "react";
import { renderWithMentions } from "./mentions";

/**
 * Render chat message content with rich formatting:
 *  - Mentions (@Name, @channel, @here) — purple/orange chips
 *  - Inline code spans (`code`) — monospace pill
 *  - Code fences (```lang ... ```) — code block with language label,
 *    minimal token coloring (keywords / strings / comments / numbers)
 *  - Bold (**text**) and italic (*text* or _text_)
 *  - URLs are kept as plain text (link previews handle them separately)
 *
 * Lightweight, dependency-free. For deeper highlighting we'd swap in
 * react-syntax-highlighter, but this covers the 80% case at zero bundle
 * cost.
 */
export function renderMessageContent(content: string): React.ReactNode[] {
  if (!content) return [];

  // Split out triple-backtick code fences first.
  const parts: Array<
    | { kind: "text"; value: string }
    | { kind: "code"; value: string; lang: string }
  > = [];
  const fenceRe = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(content)) !== null) {
    if (m.index > last) {
      parts.push({ kind: "text", value: content.slice(last, m.index) });
    }
    parts.push({
      kind: "code",
      lang: (m[1] ?? "").trim(),
      value: m[2].replace(/^\n/, "").replace(/\n$/, ""),
    });
    last = m.index + m[0].length;
  }
  if (last < content.length) {
    parts.push({ kind: "text", value: content.slice(last) });
  }

  const out: React.ReactNode[] = [];
  parts.forEach((p, i) => {
    if (p.kind === "code") {
      out.push(<CodeBlock key={`code-${i}`} code={p.value} lang={p.lang} />);
    } else {
      out.push(...renderInline(p.value, `text-${i}`));
    }
  });
  return out;
}

// Inline: `code`, **bold**, *italic*/_italic_, then mentions on the rest.
function renderInline(s: string, keyPrefix: string): React.ReactNode[] {
  if (!s) return [];
  const out: React.ReactNode[] = [];
  // Process inline code first
  const codeRe = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = codeRe.exec(s)) !== null) {
    if (m.index > last) {
      out.push(...applyEmphasis(s.slice(last, m.index), `${keyPrefix}-pre-${idx}`));
    }
    out.push(
      <code
        key={`${keyPrefix}-c-${idx++}`}
        style={{
          padding: "1px 6px",
          borderRadius: 5,
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          fontSize: "0.9em",
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          color: "var(--vyne-purple)",
        }}
      >
        {m[1]}
      </code>,
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push(...applyEmphasis(s.slice(last), `${keyPrefix}-tail`));
  }
  return out;
}

function applyEmphasis(s: string, keyPrefix: string): React.ReactNode[] {
  // Process **bold**, then *italic* / _italic_, then mentions.
  // Multi-pass with placeholder tokens.
  const parts: Array<{ type: "text" | "bold" | "italic"; value: string }> = [
    { type: "text", value: s },
  ];

  function expand(token: "bold" | "italic", regex: RegExp) {
    const next: typeof parts = [];
    for (const p of parts) {
      if (p.type !== "text") {
        next.push(p);
        continue;
      }
      let last = 0;
      let m: RegExpExecArray | null;
      const re = new RegExp(regex.source, "g");
      while ((m = re.exec(p.value)) !== null) {
        if (m.index > last)
          next.push({ type: "text", value: p.value.slice(last, m.index) });
        next.push({ type: token, value: m[1] });
        last = m.index + m[0].length;
      }
      if (last < p.value.length) {
        next.push({ type: "text", value: p.value.slice(last) });
      }
    }
    parts.splice(0, parts.length, ...next);
  }

  expand("bold", /\*\*([^*]+)\*\*/);
  expand("italic", /(?<![*\w])\*([^*]+)\*(?!\w)|_([^_]+)_/);

  return parts.map((p, i) => {
    if (p.type === "bold")
      return (
        <strong
          key={`${keyPrefix}-b-${i}`}
          style={{ color: "var(--text-primary)", fontWeight: 700 }}
        >
          {renderWithMentions(p.value)}
        </strong>
      );
    if (p.type === "italic")
      return (
        <em key={`${keyPrefix}-i-${i}`} style={{ fontStyle: "italic" }}>
          {renderWithMentions(p.value)}
        </em>
      );
    return (
      <React.Fragment key={`${keyPrefix}-t-${i}`}>
        {renderWithMentions(p.value)}
      </React.Fragment>
    );
  });
}

// ─── Lightweight syntax highlighter ───────────────────────────

const KEYWORDS: Record<string, RegExp> = {
  js: /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|from|default|async|await|yield|true|false|null|undefined|typeof|instanceof|in|of|try|catch|finally|throw|delete|void)\b/g,
  ts: /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|from|default|async|await|yield|true|false|null|undefined|typeof|instanceof|in|of|try|catch|finally|throw|delete|void|interface|type|enum|implements|public|private|protected|readonly|abstract|as|namespace|declare)\b/g,
  jsx: /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|from|default|async|await|yield|true|false|null|undefined|typeof|instanceof|in|of|try|catch|finally|throw|delete|void)\b/g,
  tsx: /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|from|default|async|await|yield|true|false|null|undefined|typeof|instanceof|in|of|try|catch|finally|throw|delete|void|interface|type|enum|implements|public|private|protected|readonly|abstract|as)\b/g,
  py: /\b(?:def|class|return|if|elif|else|for|while|try|except|finally|raise|with|as|import|from|pass|break|continue|None|True|False|and|or|not|is|in|lambda|yield|async|await|global|nonlocal)\b/g,
  go: /\b(?:func|return|if|else|for|range|switch|case|default|break|continue|var|const|type|struct|interface|map|chan|go|defer|select|package|import|true|false|nil|new|make)\b/g,
  rust:
    /\b(?:fn|let|mut|const|struct|enum|impl|trait|pub|use|mod|return|if|else|for|while|loop|match|break|continue|true|false|self|Self|move|ref|where|as|in|crate|super|extern|unsafe|async|await|dyn|Box|Vec|Option|Result|Some|None|Ok|Err)\b/g,
  bash: /\b(?:if|then|else|elif|fi|for|in|do|done|while|case|esac|function|return|echo|export|local|read|set|unset|source)\b/g,
  sh: /\b(?:if|then|else|elif|fi|for|in|do|done|while|case|esac|function|return|echo|export|local|read|set|unset|source)\b/g,
};

function highlightCode(code: string, lang: string): React.ReactNode[] {
  const re = KEYWORDS[lang.toLowerCase()];
  if (!re) {
    // Generic — color comments + strings + numbers only
    return tokenize(code, [
      { re: /(\/\/[^\n]*|#[^\n]*)/g, color: "#6B7280" },
      { re: /("[^"\n]*"|'[^'\n]*'|`[^`\n]*`)/g, color: "#10B981" },
      { re: /\b(\d+(?:\.\d+)?)\b/g, color: "#F59E0B" },
    ]);
  }
  return tokenize(code, [
    { re: /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g, color: "#6B7280" },
    { re: /("[^"\n]*"|'[^'\n]*'|`[^`\n]*`)/g, color: "#10B981" },
    { re, color: "#A78BFA" },
    { re: /\b(\d+(?:\.\d+)?)\b/g, color: "#F59E0B" },
  ]);
}

function tokenize(
  text: string,
  rules: Array<{ re: RegExp; color: string }>,
): React.ReactNode[] {
  // Find all matches across all rules, sort by position, render colored spans.
  type Hit = { start: number; end: number; color: string };
  const hits: Hit[] = [];
  for (const r of rules) {
    const re = new RegExp(r.re.source, r.re.flags.includes("g") ? r.re.flags : r.re.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      hits.push({ start: m.index, end: m.index + m[0].length, color: r.color });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  hits.sort((a, b) => a.start - b.start);
  // Filter overlaps — keep first
  const filtered: Hit[] = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.start >= lastEnd) {
      filtered.push(h);
      lastEnd = h.end;
    }
  }
  const out: React.ReactNode[] = [];
  let cursor = 0;
  filtered.forEach((h, i) => {
    if (h.start > cursor) out.push(text.slice(cursor, h.start));
    out.push(
      <span key={`tk-${i}`} style={{ color: h.color }}>
        {text.slice(h.start, h.end)}
      </span>,
    );
    cursor = h.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

function CodeBlock({ code, lang }: { readonly code: string; readonly lang: string }) {
  const [copied, setCopied] = React.useState(false);
  function copy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div
      style={{
        margin: "6px 0",
        borderRadius: 8,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid var(--content-border)",
        overflow: "hidden",
        fontSize: 12,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "5px 10px",
          borderBottom: "1px solid var(--content-border)",
          background: "rgba(0,0,0,0.25)",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        <span>{lang || "code"}</span>
        <button
          type="button"
          onClick={copy}
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            borderRadius: 4,
            background: copied ? "rgba(16,185,129,0.15)" : "transparent",
            border: "1px solid var(--content-border)",
            color: copied ? "#10B981" : "var(--text-secondary)",
            fontSize: 9,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "10px 12px",
          overflowX: "auto",
          color: "var(--text-primary)",
          lineHeight: 1.5,
          whiteSpace: "pre",
        }}
      >
        <code>{highlightCode(code, lang)}</code>
      </pre>
    </div>
  );
}
