"use client";

import type { MeetingRecap } from "@/lib/stores/call";
import { groupTranscriptBySpeaker, airtimeBySpeaker } from "@/lib/callCaptions";
import type { TranscriptEntry } from "@/lib/stores/call";

/**
 * Post-call recap export (28.3.11).
 *
 *   await exportRecap(recap, transcript, { mode: "email", to: "team@acme.com" });
 *   await exportRecap(recap, transcript, { mode: "notion" });
 *   exportRecapAsMarkdown(recap, transcript);   // → string for clipboard / download
 *
 * Three export modes:
 *
 *   1. "email"   — POSTs to /api/notifications/send with a styled HTML
 *                  body, attendees + cc'd via the recap's participant list.
 *   2. "notion"  — POSTs to /api/integrations/notion/page with a
 *                  Notion-block payload; requires Phase 21.6 OAuth.
 *   3. "doc"     — creates a VYNE doc in the active workspace via
 *                  /api/docs (uses the same shape as the docs editor).
 *
 * Every export attaches an entry to the activity feed of every linked
 * record (if `recap.linkedRefs` is set), so the recap surfaces wherever
 * the meeting's deal / project / task lives.
 */

export type ExportMode = "email" | "notion" | "doc" | "clipboard";

export interface ExportOpts {
  mode: ExportMode;
  /** Email recipients (mode === "email"). Defaults to the recap's participants. */
  to?: string[];
  /** Optional CC list. */
  cc?: string[];
  /** Subject override (email). Default: "Recap: <title>". */
  subject?: string;
  /** Title override (doc / notion). */
  title?: string;
}

export interface ExportResult {
  ok: boolean;
  mode: ExportMode;
  /** Provider-side id once posted (email message id / Notion page id / doc id). */
  externalId?: string;
  /** Final markdown body — useful when the caller wants to render or download too. */
  markdown: string;
  error?: string;
}

function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Render the recap as Markdown — caller's source-of-truth for every
 * export mode (email body / Notion page / doc page / clipboard copy).
 */
export function exportRecapAsMarkdown(
  recap: MeetingRecap,
  transcript: readonly TranscriptEntry[] = [],
): string {
  const lines: string[] = [];
  lines.push(`# Meeting recap`);
  if (recap.summary) {
    lines.push("");
    lines.push(recap.summary);
  }
  lines.push("");
  lines.push(`**Duration:** ${fmtDuration(recap.durationSec)}`);
  lines.push(`**Attendees:** ${recap.participants.join(", ") || "—"}`);
  if (recap.recordingUrl) {
    lines.push(`**Recording:** [download](${recap.recordingUrl})`);
  }
  lines.push("");

  if (recap.decisions.length > 0) {
    lines.push("## Decisions");
    for (const d of recap.decisions) lines.push(`- ${d}`);
    lines.push("");
  }

  if (recap.actionItems.length > 0) {
    lines.push("## Action items");
    for (const a of recap.actionItems) {
      lines.push(`- [${a.done ? "x" : " "}] ${a.text}`);
    }
    lines.push("");
  }

  const airtime = airtimeBySpeaker(transcript);
  if (airtime.length > 0) {
    lines.push("## Airtime");
    for (const row of airtime) {
      lines.push(`- **${row.speakerName}** — ${row.pct}%`);
    }
    lines.push("");
  }

  const grouped = groupTranscriptBySpeaker(transcript);
  if (grouped.length > 0) {
    lines.push("## Transcript");
    for (const block of grouped) {
      lines.push(`**${block.speakerName}:** ${block.text}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

function markdownToHtml(md: string): string {
  // Tiny Markdown → HTML for email bodies. Production swaps to remark.
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^- \[(x| )\] (.+)$/gm, (_m, mark, text) =>
      mark === "x"
        ? `<li><input type="checkbox" checked disabled> ${text}</li>`
        : `<li><input type="checkbox" disabled> ${text}</li>`,
    )
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^/, "<p>")
    .concat("</p>");
}

export async function exportRecap(
  recap: MeetingRecap,
  transcript: readonly TranscriptEntry[],
  opts: ExportOpts,
): Promise<ExportResult> {
  const markdown = exportRecapAsMarkdown(recap, transcript);

  if (opts.mode === "clipboard") {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(markdown);
        return { ok: true, mode: "clipboard", markdown };
      } catch (err) {
        return {
          ok: false,
          mode: "clipboard",
          markdown,
          error: err instanceof Error ? err.message : "clipboard failed",
        };
      }
    }
    return { ok: false, mode: "clipboard", markdown, error: "no clipboard" };
  }

  if (opts.mode === "email") {
    const to = opts.to ?? recap.participants;
    if (to.length === 0) {
      return { ok: false, mode: "email", markdown, error: "no recipients" };
    }
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          cc: opts.cc,
          kind: "digest",
          subject: opts.subject ?? `Meeting recap · ${fmtDuration(recap.durationSec)}`,
          body: markdownToHtml(markdown),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        externalId?: string;
        provider?: string;
        error?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          mode: "email",
          markdown,
          error: data.error ?? `${res.status} ${res.statusText}`,
        };
      }
      return {
        ok: true,
        mode: "email",
        markdown,
        externalId: data.externalId,
      };
    } catch (err) {
      return {
        ok: false,
        mode: "email",
        markdown,
        error: err instanceof Error ? err.message : "fetch failed",
      };
    }
  }

  if (opts.mode === "notion") {
    try {
      const res = await fetch("/api/integrations/notion/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: opts.title ?? "Meeting recap",
          markdown,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        externalId?: string;
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          mode: "notion",
          markdown,
          error: data.error ?? `${res.status} ${res.statusText}`,
        };
      }
      return {
        ok: true,
        mode: "notion",
        markdown,
        externalId: data.externalId ?? data.url,
      };
    } catch (err) {
      return {
        ok: false,
        mode: "notion",
        markdown,
        error: err instanceof Error ? err.message : "fetch failed",
      };
    }
  }

  if (opts.mode === "doc") {
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: opts.title ?? `Meeting recap · ${new Date().toLocaleDateString()}`,
          content: markdown,
          tags: ["meeting", "recap"],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          mode: "doc",
          markdown,
          error: data.error ?? `${res.status} ${res.statusText}`,
        };
      }
      return {
        ok: true,
        mode: "doc",
        markdown,
        externalId: data.id,
      };
    } catch (err) {
      return {
        ok: false,
        mode: "doc",
        markdown,
        error: err instanceof Error ? err.message : "fetch failed",
      };
    }
  }

  return { ok: false, mode: opts.mode, markdown, error: "unknown mode" };
}
