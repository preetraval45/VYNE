"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Star,
  Clock,
  Tag,
  ChevronRight,
  ExternalLink,
  Filter,
  Hash,
  Briefcase,
  User,
  ListChecks,
  FileText,
  Receipt,
  Box,
  AtSign,
} from "lucide-react";
import {
  searchCorpus,
  groupByType,
  type EntityType,
  type ScoredHit,
} from "@/lib/search/core";
import { buildGlobalCorpus, buildVocabulary } from "@/lib/search/corpus";
import { parseQuery, correctQuery } from "@/lib/search/queryChips";
import { useSavedSearches } from "@/lib/stores/savedSearches";
import { useSearchAnalytics } from "@/lib/stores/searchAnalytics";
import { useDebounce } from "@/hooks/useDebounce";

const RECENT_KEY = "vyne-global-search-recent";
const MAX_RECENT = 8;

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

const TYPE_ICONS: Record<EntityType, React.ReactNode> = {
  deal: <Briefcase size={12} />,
  contact: <User size={12} />,
  project: <ListChecks size={12} />,
  task: <ListChecks size={12} />,
  invoice: <Receipt size={12} />,
  product: <Box size={12} />,
  doc: <FileText size={12} />,
  message: <AtSign size={12} />,
  channel: <Hash size={12} />,
  person: <User size={12} />,
  page: <ExternalLink size={12} />,
  command: <ChevronRight size={12} />,
  attachment: <FileText size={12} />,
};

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function saveRecent(items: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

export interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * GlobalSearchModal — Phase 14 spotlight-style global semantic search.
 *
 * Combines:
 *   - search/core scoring against the live store corpus (deals, contacts,
 *     projects, tasks, invoices, docs, products)
 *   - filter chip parser (`from:`, `type:`, `in:`, `has:`, `before:`,
 *     `after:`) — chips render as inline pills above the input
 *   - did-you-mean correction when zero results
 *   - recent searches (localStorage) + starred saved searches (zustand)
 *   - keyboard navigation: arrows / Enter / Esc / Space-preview
 *   - analytics counter for every submission
 *
 * Distinct from `<CommandPalette />` (action runner) — this surface is
 * record search; Cmd+K still owns commands. Triggered via Ctrl+/ (handled
 * by the parent layout).
 */
export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const saved = useSavedSearches();
  const analytics = useSearchAnalytics();

  useEffect(() => {
    if (!open) return;
    setRecent(loadRecent());
    setQuery("");
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Compute hits with scoring + grouping; keep flat list for keyboard nav.
  const { hits, parsed, suggestion } = useMemo(() => {
    const trimmed = debounced.trim();
    const parsed = parseQuery(trimmed);
    if (!trimmed) return { hits: [], parsed, suggestion: null as string | null };
    const corpus = buildGlobalCorpus();
    const result = searchCorpus(corpus, trimmed, 60);
    const suggestion =
      result.length === 0 && parsed.text.length >= 4
        ? correctQuery(parsed.text, buildVocabulary())
        : null;
    return { hits: result, parsed, suggestion };
  }, [debounced]);

  const grouped = useMemo(() => groupByType(hits), [hits]);
  const flat = useMemo(() => Array.from(grouped.values()).flat(), [grouped]);
  const previewed: ScoredHit | null =
    flat.length > 0 ? flat[Math.min(selectedIndex, flat.length - 1)] ?? null : null;

  // Reset selection on query change.
  useEffect(() => setSelectedIndex(0), [debounced]);

  // Log every settled search to analytics.
  useEffect(() => {
    if (!open || !debounced.trim()) return;
    analytics.record({
      query: debounced,
      resultCount: hits.length,
      clicked: false,
    });
    // Snapshot for the lifetime of this query — we don't want a record
    // every keystroke; the debounce already smooths that.
  }, [debounced, hits.length, open, analytics]);

  const commit = useCallback(
    (hit: ScoredHit) => {
      if (!hit.record.href) return;
      const next = [
        debounced.trim(),
        ...recent.filter((r) => r !== debounced.trim()),
      ]
        .filter(Boolean)
        .slice(0, MAX_RECENT);
      saveRecent(next);
      setRecent(next);
      analytics.record({
        query: debounced,
        resultCount: hits.length,
        clicked: true,
        clickedCategory: hit.record.type,
      });
      router.push(hit.record.href);
      onClose();
    },
    [debounced, recent, router, onClose, analytics, hits.length],
  );

  // Keyboard navigation.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (flat.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % flat.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + flat.length) % flat.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = flat[selectedIndex];
        if (target) commit(target);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, selectedIndex, commit, onClose]);

  if (!open) return null;

  const chipEntries = Object.entries(parsed.chips).filter(([, v]) => v);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "10vh 24px 24px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          maxHeight: "min(640px, 80vh)",
          display: "flex",
          flexDirection: "column",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 14,
          boxShadow: "0 28px 56px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
      >
        {/* Search input + chips */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--content-border)",
            flexWrap: "wrap",
          }}
        >
          <Search size={16} style={{ color: "var(--text-tertiary)" }} />
          {chipEntries.map(([key, value]) => (
            <span
              key={key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)",
                color: "var(--vyne-accent, var(--vyne-purple))",
                border: "1px solid rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.32)",
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {key}:{value}
            </span>
          ))}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything · try from:sarah type:deal"
            aria-label="Global search"
            style={{
              flex: 1,
              minWidth: 200,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 15,
              padding: "4px 0",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={iconBtn}
            >
              <X size={14} />
            </button>
          )}
          <kbd
            style={{
              padding: "2px 6px",
              borderRadius: 5,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-tertiary)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
          >
            Esc
          </kbd>
        </header>

        {/* Body — split pane: results left, preview right */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: previewed ? "1fr 280px" : "1fr",
            minHeight: 0,
          }}
        >
          {/* Left: groups + recent + saved */}
          <div
            style={{
              overflow: "auto",
              padding: 8,
              borderRight: previewed ? "1px solid var(--content-border)" : undefined,
            }}
          >
            {!query.trim() && (
              <>
                {saved.items.length > 0 && (
                  <Group title="Saved" icon={<Star size={11} />}>
                    {saved.items
                      .slice()
                      .sort(
                        (a, b) =>
                          (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0),
                      )
                      .map((s) => (
                        <SidebarRow
                          key={s.id}
                          icon={<Star size={11} />}
                          label={s.name}
                          hint={s.query}
                          onClick={() => setQuery(s.query)}
                          onDelete={() => saved.remove(s.id)}
                        />
                      ))}
                  </Group>
                )}
                {recent.length > 0 && (
                  <Group title="Recent" icon={<Clock size={11} />}>
                    {recent.map((r) => (
                      <SidebarRow
                        key={r}
                        icon={<Clock size={11} />}
                        label={r}
                        onClick={() => setQuery(r)}
                      />
                    ))}
                  </Group>
                )}
                {recent.length === 0 && saved.items.length === 0 && (
                  <EmptyHint />
                )}
              </>
            )}

            {query.trim() && hits.length === 0 && (
              <div
                style={{
                  padding: "32px 18px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  No results for "{parsed.text || query}"
                </div>
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => setQuery(suggestion)}
                    style={{
                      marginTop: 4,
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--content-border)",
                      background: "var(--content-secondary)",
                      color: "var(--vyne-accent, var(--vyne-purple))",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Did you mean <strong>{suggestion}</strong>?
                  </button>
                )}
                {!suggestion && (
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    Try fewer words, or use{" "}
                    <code
                      style={{
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "var(--content-secondary)",
                        fontSize: 11,
                      }}
                    >
                      type:deal
                    </code>{" "}
                    to narrow the type.
                  </div>
                )}
              </div>
            )}

            {query.trim() &&
              Array.from(grouped.entries()).map(([type, list]) => (
                <Group
                  key={type}
                  title={`${TYPE_LABELS[type]} (${list.length})`}
                  icon={TYPE_ICONS[type]}
                >
                  {list.map((hit) => {
                    const flatIdx = flat.indexOf(hit);
                    const active = flatIdx === selectedIndex;
                    return (
                      <ResultRow
                        key={hit.record.id}
                        hit={hit}
                        active={active}
                        onClick={() => commit(hit)}
                        onHover={() => setSelectedIndex(flatIdx)}
                      />
                    );
                  })}
                </Group>
              ))}

            {query.trim() && (
              <div
                style={{
                  padding: "8px 12px 4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  borderTop: "1px solid var(--content-border)",
                  marginTop: 4,
                }}
              >
                <span>
                  {hits.length === 0
                    ? "0 results"
                    : `${hits.length} result${hits.length === 1 ? "" : "s"}`}
                </span>
                {hits.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      saved.save(query.trim());
                    }}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 5,
                      border: "1px solid var(--content-border)",
                      background: "var(--content-secondary)",
                      color: "var(--vyne-accent, var(--vyne-purple))",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Star size={10} style={{ marginRight: 4 }} /> Save
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: preview pane */}
          {previewed && (
            <aside
              aria-label="Preview"
              style={{
                padding: 16,
                background: "var(--content-secondary)",
                overflow: "auto",
                fontSize: 12.5,
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.04,
                  textTransform: "uppercase",
                  color: "var(--vyne-accent, var(--vyne-purple))",
                  marginBottom: 6,
                }}
              >
                {TYPE_ICONS[previewed.record.type]}
                {TYPE_LABELS[previewed.record.type]}
              </div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: "0 0 4px",
                  lineHeight: 1.25,
                }}
              >
                {previewed.record.title}
              </h3>
              {previewed.record.subtitle && (
                <p style={{ margin: "0 0 8px" }}>{previewed.record.subtitle}</p>
              )}
              {previewed.record.body && (
                <p
                  style={{
                    margin: "8px 0",
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                    maxHeight: 220,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 8,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {previewed.record.body.slice(0, 600)}
                </p>
              )}
              {previewed.record.tags && previewed.record.tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    marginTop: 10,
                  }}
                >
                  {previewed.record.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        padding: "1px 8px",
                        borderRadius: 999,
                        background: "var(--content-bg)",
                        border: "1px solid var(--content-border)",
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {previewed.record.owner && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Owner: {previewed.record.owner}
                </div>
              )}
              {previewed.record.updatedAt && (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Updated: {new Date(previewed.record.updatedAt).toLocaleString()}
                </div>
              )}
              <button
                type="button"
                onClick={() => commit(previewed)}
                style={{
                  marginTop: 14,
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--vyne-accent, var(--vyne-purple))",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                Open <ChevronRight size={13} />
              </button>
            </aside>
          )}
        </div>

        {/* Footer hint */}
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 14px",
            borderTop: "1px solid var(--content-border)",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          <Hint k="↑↓" t="Navigate" />
          <Hint k="↵" t="Open" />
          <Hint k="Esc" t="Close" />
          <span style={{ flex: 1 }} />
          <Filter size={11} />
          <span>Try:</span>
          <code style={chipHintStyle}>type:deal</code>
          <code style={chipHintStyle}>from:sarah</code>
          <code style={chipHintStyle}>in:invoicing</code>
        </footer>
      </div>
    </div>
  );
}

function Group({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 4 }}>
      <header
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 10px 4px",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-tertiary)",
        }}
      >
        {icon}
        {title}
      </header>
      <div>{children}</div>
    </section>
  );
}

function ResultRow({
  hit,
  active,
  onClick,
  onHover,
}: {
  hit: ScoredHit;
  active: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      aria-selected={active}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 7,
        border: "none",
        background: active
          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
          : "transparent",
        color: active
          ? "var(--vyne-accent, var(--vyne-purple))"
          : "var(--text-primary)",
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          color: "var(--text-tertiary)",
          flexShrink: 0,
        }}
      >
        {TYPE_ICONS[hit.record.type]}
      </span>
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
      <span
        aria-hidden="true"
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          fontWeight: 600,
        }}
        title={hit.reason.join(", ")}
      >
        {hit.score}
      </span>
    </button>
  );
}

function SidebarRow({
  icon,
  label,
  hint,
  onClick,
  onDelete,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: "var(--text-primary)",
          fontSize: 12.5,
          cursor: "pointer",
          textAlign: "left",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background =
            "var(--content-secondary)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "transparent")
        }
      >
        <span style={{ color: "var(--text-tertiary)" }}>{icon}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        {hint && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 200,
            }}
          >
            {hint}
          </span>
        )}
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete saved search"
          style={iconBtn}
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div
      style={{
        padding: "40px 24px",
        textAlign: "center",
        color: "var(--text-tertiary)",
        fontSize: 12.5,
        lineHeight: 1.5,
      }}
    >
      <Search size={28} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
        Search every record
      </div>
      <div>Deals · contacts · tasks · invoices · docs · products.</div>
      <div style={{ marginTop: 6 }}>
        Use <code style={chipHintStyle}>type:deal</code>{" "}
        <code style={chipHintStyle}>from:sarah</code> to narrow.
      </div>
    </div>
  );
}

function Hint({ k, t }: { k: string; t: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <kbd
        style={{
          padding: "1px 5px",
          borderRadius: 4,
          border: "1px solid var(--content-border)",
          background: "var(--content-secondary)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
        }}
      >
        {k}
      </kbd>
      {t}
    </span>
  );
}

const iconBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  borderRadius: 5,
  cursor: "pointer",
};

const chipHintStyle: React.CSSProperties = {
  padding: "1px 6px",
  borderRadius: 4,
  border: "1px solid var(--content-border)",
  background: "var(--content-secondary)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-secondary)",
};
