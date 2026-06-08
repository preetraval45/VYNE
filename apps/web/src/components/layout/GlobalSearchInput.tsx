"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings2, CornerDownLeft } from "lucide-react";
import {
  searchCorpus,
  groupByType,
  type EntityType,
  type ScoredHit,
} from "@/lib/search/core";
import { buildGlobalCorpus } from "@/lib/search/corpus";
import { useSearchAnalytics } from "@/lib/stores/searchAnalytics";
import { useUIStore } from "@/lib/stores/ui";
import { useDebounce } from "@/hooks/useDebounce";

const TYPE_LABELS: Record<EntityType, string> = {
  deal: "Deals",
  contact: "Contacts",
  project: "Projects",
  task: "Tasks",
  invoice: "Invoices",
  product: "Products",
  doc: "Docs",
  message: "Messages",
  channel: "Channels",
  person: "People",
  page: "Pages",
  command: "Commands",
  attachment: "Attachments",
};

/**
 * GlobalSearchInput — the always-visible global search bar in the topbar.
 *
 * Replaces the old magnifier-icon-that-opens-a-modal. Typing here searches
 * the live workspace corpus (deals, contacts, projects, tasks, invoices,
 * docs, products) and drops an inline results panel beneath the input —
 * no full-screen takeover. The gear on the right opens the advanced filter
 * modal (`GlobalSearchModal`, also bound to Ctrl+/) for chip syntax,
 * preview pane, saved searches, etc.
 *
 * IMPORTANT: this reads `useSearchAnalytics` via getState(), never as a
 * subscription — the logging effect calls record(), and subscribing would
 * spin an infinite render loop (React #185), the exact crash that took the
 * old GlobalSearchModal down on every keystroke.
 */
export function GlobalSearchInput() {
  const router = useRouter();
  const openAdvanced = useUIStore((s) => s.setGlobalSearchOpen);
  const openCommandPalette = useUIStore((s) => s.setCommandPaletteOpen);
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 180);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => {
    const trimmed = debounced.trim();
    if (!trimmed) return [] as ScoredHit[];
    return searchCorpus(buildGlobalCorpus(), trimmed, 24);
  }, [debounced]);

  const grouped = useMemo(() => groupByType(hits), [hits]);
  const flat = useMemo(() => Array.from(grouped.values()).flat(), [grouped]);

  useEffect(() => setSelectedIndex(0), [debounced]);

  // Log each settled query — getState(), never a subscription (see note above).
  useEffect(() => {
    const q = debounced.trim();
    if (!q) return;
    useSearchAnalytics.getState().record({
      query: q,
      resultCount: hits.length,
      clicked: false,
    });
  }, [debounced, hits.length]);

  const commit = useCallback(
    (hit: ScoredHit) => {
      if (!hit.record.href) return;
      useSearchAnalytics.getState().record({
        query: debounced,
        resultCount: hits.length,
        clicked: true,
        clickedCategory: hit.record.type,
      });
      router.push(hit.record.href);
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [debounced, hits.length, router],
  );

  // Click-outside dismiss.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      // Empty-handed Enter (or no hits) → hand off to the advanced modal
      // pre-filled with the current text so nothing is lost.
      const target = flat[selectedIndex];
      if (target) {
        e.preventDefault();
        commit(target);
      } else if (query.trim()) {
        e.preventDefault();
        openAdvanced(true);
      }
      return;
    }
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setSelectedIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + flat.length) % flat.length);
    }
  }

  const showPanel = open && query.trim().length > 0;

  return (
    <div
      ref={containerRef}
      className="vyne-unified-search"
      role="search"
      style={{ position: "relative", flexShrink: 1, minWidth: 0 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 32,
          width: 240,
          maxWidth: "100%",
          padding: "0 4px 0 10px",
          borderRadius: 999,
          border: showPanel
            ? "1px solid var(--vyne-accent, var(--vyne-purple))"
            : "1px solid var(--content-border)",
          background: "var(--input-bg, var(--content-secondary))",
          boxShadow: showPanel
            ? "0 0 0 3px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18)"
            : "none",
        }}
      >
        <Search
          size={14}
          style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search records…"
          aria-label="Search records"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 13,
          }}
        />
        <button
          type="button"
          onClick={() => openCommandPalette(true)}
          aria-label="Open command palette"
          title="Command palette — search everything"
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-tertiary)",
            borderRadius: 5,
            padding: "1px 5px",
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {isMac ? "⌘K" : "Ctrl K"}
        </button>
        <button
          type="button"
          onClick={() => openAdvanced(true)}
          aria-label="Advanced search & filters"
          title="Advanced search & filters (Ctrl+/)"
          style={{
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: "var(--text-tertiary)",
            borderRadius: 999,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Settings2 size={14} />
        </button>
      </div>

      {showPanel && (
        <div
          role="listbox"
          aria-label="Search results"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 380,
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "min(440px, 70vh)",
            overflowY: "auto",
            zIndex: 70,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.24)",
            padding: 6,
          }}
        >
          {flat.length === 0 ? (
            <div
              style={{
                padding: "22px 14px",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 12.5,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                No results for &quot;{query.trim()}&quot;
              </div>
              <button
                type="button"
                onClick={() => openAdvanced(true)}
                style={{
                  marginTop: 4,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                  color: "var(--vyne-accent, var(--vyne-purple))",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Try advanced search
              </button>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([type, list]) => (
              <section key={type} style={{ marginBottom: 2 }}>
                <header
                  style={{
                    padding: "6px 10px 3px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {TYPE_LABELS[type]} ({list.length})
                </header>
                {list.map((hit) => {
                  const flatIdx = flat.indexOf(hit);
                  const active = flatIdx === selectedIndex;
                  return (
                    <button
                      key={hit.record.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => commit(hit)}
                      onMouseEnter={() => setSelectedIndex(flatIdx)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: "none",
                        background: active
                          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                          : "transparent",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {hit.record.title}
                        </span>
                        {hit.record.subtitle && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-tertiary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {hit.record.subtitle}
                          </span>
                        )}
                      </span>
                      {active && (
                        <CornerDownLeft
                          size={13}
                          style={{
                            color: "var(--text-tertiary)",
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}
