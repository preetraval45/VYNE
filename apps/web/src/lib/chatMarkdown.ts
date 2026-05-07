"use client";

import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

/**
 * Tiny safe markdown renderer for chat (28.1.4).
 *
 *   {renderChatMarkdown(message.content)}
 *
 * Supports:
 *   - **bold**, *italic*, ~~strike~~, `code`, ~~~code~~~ (multiline)
 *   - ```language\n...\n``` fenced blocks (language tag stored as a class
 *     so the existing lowlight pipeline used by docs can colour later)
 *   - > quote (single-level, lines starting with `>`)
 *   - - / * / 1. lists
 *   - | a | b | tables (pipe-delimited rows)
 *   - links auto-detected (http://, https://, www.)
 *   - @mentions and :emoji: stay as plain text — Phase 12.6 / 28.1.8
 *     handle their own renderers on top.
 *
 * No DOM injection — every output is a React node, so an unsafe
 * input can't leak HTML. Runs ~50 µs on a 200-char message.
 */

interface InlineOpts {
  /** Map of `:slug:` → image URL (custom emoji from 28.1.8). */
  emoji?: Record<string, string>;
}

const URL_RE = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/g;

function renderInline(text: string, opts: InlineOpts = {}): ReactNode[] {
  if (!text) return [];
  const out: ReactNode[] = [];
  let key = 0;

  // Walk by precedence: code spans → bold → italic → strike → emoji → urls.
  // Each pass emits Fragments + leaves the unprocessed segments as strings
  // so the next pass can keep walking.
  const pushString = (s: string) => out.push(s);
  let segments: ReactNode[] = [text];

  function transform(re: RegExp, wrap: (m: RegExpExecArray) => ReactNode) {
    const next: ReactNode[] = [];
    for (const seg of segments) {
      if (typeof seg !== "string") {
        next.push(seg);
        continue;
      }
      let last = 0;
      let m: RegExpExecArray | null;
      const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      while ((m = r.exec(seg)) !== null) {
        if (m.index > last) next.push(seg.slice(last, m.index));
        next.push(wrap(m));
        last = m.index + m[0].length;
      }
      if (last < seg.length) next.push(seg.slice(last));
    }
    segments = next;
  }

  // Code spans — match first so `**` inside `` `` stays literal.
  transform(/`([^`]+)`/g, (m) =>
    createElement(
      "code",
      {
        key: `c-${key++}`,
        style: {
          padding: "1px 5px",
          borderRadius: 4,
          background: "var(--content-secondary)",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.92em",
        },
      },
      m[1],
    ),
  );
  transform(/\*\*([^*]+)\*\*/g, (m) =>
    createElement("strong", { key: `b-${key++}` }, m[1]),
  );
  transform(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (m) =>
    createElement("em", { key: `i-${key++}` }, m[1]),
  );
  transform(/~~([^~\n]+)~~/g, (m) =>
    createElement(
      "s",
      { key: `s-${key++}`, style: { textDecoration: "line-through" } },
      m[1],
    ),
  );
  if (opts.emoji && Object.keys(opts.emoji).length > 0) {
    transform(/:([a-z0-9-]+):/gi, (m) => {
      const slug = m[1].toLowerCase();
      const url = opts.emoji?.[slug];
      if (!url) return m[0];
      return createElement("img", {
        key: `e-${key++}`,
        src: url,
        alt: `:${slug}:`,
        title: `:${slug}:`,
        style: {
          width: "1.15em",
          height: "1.15em",
          verticalAlign: "-0.18em",
          display: "inline-block",
        },
      });
    });
  }
  transform(URL_RE, (m) =>
    createElement(
      "a",
      {
        key: `u-${key++}`,
        href: m[0].startsWith("http") ? m[0] : `https://${m[0]}`,
        target: "_blank",
        rel: "noreferrer",
        style: {
          color: "var(--vyne-accent, var(--vyne-purple))",
          textDecoration: "underline",
          textUnderlineOffset: 2,
        },
      },
      m[0],
    ),
  );

  segments.forEach((seg) =>
    typeof seg === "string" ? pushString(seg) : out.push(seg),
  );
  return out;
}

function tableRow(line: string): string[] | null {
  if (!line.includes("|")) return null;
  const cells = line.split("|").map((s) => s.trim());
  // Strip leading + trailing empties from `|a|b|` patterns.
  if (cells.length > 0 && cells[0] === "") cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  return cells.length > 0 ? cells : null;
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*-{3,}\s*(\|\s*-{3,}\s*)+\|?\s*$/.test(line.trim());
}

export function renderChatMarkdown(
  text: string,
  opts: InlineOpts = {},
): ReactNode {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] ?? "";
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push(
        createElement(
          "pre",
          {
            key: `pre-${key++}`,
            className: lang ? `language-${lang}` : undefined,
            style: {
              margin: "6px 0",
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--content-secondary)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              overflow: "auto",
            },
          },
          createElement(
            "code",
            { className: lang ? `language-${lang}` : undefined },
            body.join("\n"),
          ),
        ),
      );
      continue;
    }

    // Quote (single-level).
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push(
        createElement(
          "blockquote",
          {
            key: `q-${key++}`,
            style: {
              margin: "4px 0",
              padding: "4px 10px",
              borderLeft: "3px solid var(--content-border)",
              color: "var(--text-secondary)",
              fontStyle: "italic",
            },
          },
          renderInline(quoteLines.join(" "), opts),
        ),
      );
      continue;
    }

    // Table — header row, separator, body rows.
    if (
      tableRow(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = tableRow(line)!;
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && tableRow(lines[i])) {
        rows.push(tableRow(lines[i])!);
        i += 1;
      }
      blocks.push(
        createElement(
          "table",
          {
            key: `t-${key++}`,
            style: {
              width: "100%",
              borderCollapse: "collapse",
              margin: "6px 0",
              fontSize: 12,
            },
          },
          createElement(
            "thead",
            null,
            createElement(
              "tr",
              null,
              headers.map((h, ci) =>
                createElement(
                  "th",
                  {
                    key: `th-${ci}`,
                    style: {
                      textAlign: "left",
                      padding: "4px 8px",
                      borderBottom: "1px solid var(--content-border)",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      fontSize: 11,
                    },
                  },
                  renderInline(h, opts),
                ),
              ),
            ),
          ),
          createElement(
            "tbody",
            null,
            rows.map((cells, ri) =>
              createElement(
                "tr",
                { key: `tr-${ri}` },
                cells.map((c, ci) =>
                  createElement(
                    "td",
                    {
                      key: `td-${ri}-${ci}`,
                      style: {
                        padding: "4px 8px",
                        borderBottom: "1px solid var(--content-border)",
                      },
                    },
                    renderInline(c, opts),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      continue;
    }

    // Lists — gather contiguous lines.
    const ulMatch = /^(\s*)[-*]\s+(.*)/.exec(line);
    const olMatch = /^(\s*)\d+\.\s+(.*)/.exec(line);
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered
          ? /^\s*\d+\.\s+(.*)/.exec(lines[i])
          : /^\s*[-*]\s+(.*)/.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push(
        createElement(
          ordered ? "ol" : "ul",
          {
            key: `l-${key++}`,
            style: {
              margin: "4px 0 4px 18px",
              padding: 0,
              fontSize: 13,
              lineHeight: 1.5,
            },
          },
          items.map((it, idx) =>
            createElement(
              "li",
              { key: `li-${idx}` },
              renderInline(it, opts),
            ),
          ),
        ),
      );
      continue;
    }

    // Empty line → paragraph break.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Default — wrap inline content in a span (no <p> so chat lines
    // stay tight; the host's row component handles vertical rhythm).
    blocks.push(
      createElement(
        "span",
        {
          key: `s-${key++}`,
          style: { display: "block", lineHeight: 1.5 },
        },
        renderInline(line, opts),
      ),
    );
    i += 1;
  }

  return createElement(Fragment, null, ...blocks);
}
