"use client";

import { useMemo, useState } from "react";
import { Play, ExternalLink, Sparkles } from "lucide-react";

/**
 * TutorialLibrary — a searchable list of short tutorial videos /
 * walkthroughs auto-generated per release. Each item is a single
 * data row mapping a feature to a 30-90 s screen recording URL plus
 * the changelog entry that prompted it.
 *
 * The pipeline lives outside this file: a CI step on every release
 * runs a screen-recording generator (Loom API / Playwright + ffmpeg)
 * over the changelog entries, uploads the MP4 to object storage, and
 * appends a row to `TUTORIALS` below. Until that pipeline lands, the
 * curated seed list ships an evergreen catalogue of evergreen demos.
 */

interface Tutorial {
  id: string;
  title: string;
  description: string;
  module: string;
  durationSec: number;
  /** YouTube / Loom / S3 URL. Opens in a new tab. */
  videoUrl?: string;
  /** Changelog entry that prompted this tutorial. */
  changelogTag?: string;
  /** Tagged for filtering. */
  tags?: string[];
}

const TUTORIALS: Tutorial[] = [
  {
    id: "cmdk-basics",
    title: "Cmd+K — find anything in 2 keystrokes",
    description:
      "Search records, run commands, ask AI — all from a single keyboard shortcut.",
    module: "global",
    durationSec: 45,
    tags: ["search", "keyboard"],
  },
  {
    id: "saved-views",
    title: "Saved views — pin a filter combo",
    description: "Star, share, and pin a saved filter on any list page.",
    module: "global",
    durationSec: 30,
    tags: ["filters", "views"],
  },
  {
    id: "global-search-modal",
    title: "Global search modal (Ctrl+/)",
    description:
      "Spotlight-style record finder with type-grouped results, chip filters (type:deal from:sarah), and an inline preview pane.",
    module: "global",
    durationSec: 60,
    changelogTag: "phase-14",
    tags: ["search"],
  },
  {
    id: "notification-center",
    title: "Notification center + web push",
    description:
      "Per-module mute, DND schedule, snooze, cross-device read state, web push — all wired into a single bell.",
    module: "global",
    durationSec: 75,
    changelogTag: "phase-13",
    tags: ["notifications"],
  },
  {
    id: "follow-teammate",
    title: "Live cursors + follow mode",
    description:
      "Click a teammate's avatar in the presence bubbles to mirror their viewport across pages.",
    module: "global",
    durationSec: 30,
    changelogTag: "phase-12",
    tags: ["collaboration"],
  },
  {
    id: "filter-search-bar",
    title: "Odoo-style filter dropdown",
    description:
      "Three-column search (Filters / Group By / Favorites) with one-click predicates and saved-search persistence.",
    module: "projects",
    durationSec: 45,
    changelogTag: "phase-13",
    tags: ["filters", "views"],
  },
  {
    id: "ai-deal-coach",
    title: "AI deal coach on CRM",
    description:
      "Surfaces stalled deals + drafts re-engagement messages tailored to the deal stage.",
    module: "crm",
    durationSec: 50,
    tags: ["ai"],
  },
  {
    id: "sla-countdown",
    title: "SLA breach countdown banners",
    description:
      "Colour-banded pill on records that auto-flips to red and switches aria-live to assertive once breached.",
    module: "invoicing",
    durationSec: 30,
    changelogTag: "phase-13",
    tags: ["sla", "notifications"],
  },
];

export function TutorialLibrary() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TUTORIALS;
    return TUTORIALS.filter((t) => {
      const haystack = `${t.title} ${t.description} ${t.module} ${t.tags?.join(" ") ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const total = TUTORIALS.reduce((sum, t) => sum + t.durationSec, 0);

  return (
    <section
      aria-label="Tutorial library"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Sparkles size={14} style={{ color: "#F59E0B" }} />
            Tutorials
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                background: "var(--content-secondary)",
                padding: "1px 8px",
                borderRadius: 999,
              }}
            >
              {TUTORIALS.length} clips · ~{Math.round(total / 60)}m total
            </span>
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            Auto-generated from each release's changelog. Bite-sized walkthroughs
            of every shipped feature.
          </p>
        </div>
        <input
          type="search"
          placeholder="Filter tutorials…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter tutorials"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 12,
            minWidth: 180,
            outline: "none",
          }}
        />
      </header>

      <div
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 10,
        }}
      >
        {filtered.length === 0 && (
          <p
            style={{
              gridColumn: "1 / -1",
              padding: "30px 0",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            No tutorials match that filter.
          </p>
        )}
        {filtered.map((t) => (
          <article
            key={t.id}
            role="listitem"
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "relative",
                aspectRatio: "16 / 9",
                borderRadius: 8,
                background:
                  "linear-gradient(135deg, var(--content-secondary), var(--content-bg))",
                border: "1px solid var(--content-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--vyne-accent, var(--vyne-purple))",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                }}
              >
                <Play size={14} fill="currentColor" />
              </span>
              <span
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 8,
                  padding: "1px 8px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {Math.floor(t.durationSec / 60)}:
                {String(t.durationSec % 60).padStart(2, "0")}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.35,
              }}
            >
              {t.title}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "var(--text-tertiary)",
                lineHeight: 1.45,
              }}
            >
              {t.description}
            </p>
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <span>{t.module}</span>
              {t.changelogTag && (
                <span
                  style={{
                    padding: "1px 7px",
                    borderRadius: 999,
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "#F59E0B",
                  }}
                >
                  {t.changelogTag}
                </span>
              )}
            </div>
            {t.videoUrl ? (
              <a
                href={t.videoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Play tutorial: ${t.title}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: "var(--vyne-accent, var(--vyne-purple))",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Play size={11} /> Watch
              </a>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: "1px dashed var(--content-border)",
                  color: "var(--text-tertiary)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <ExternalLink size={11} /> Coming soon
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
