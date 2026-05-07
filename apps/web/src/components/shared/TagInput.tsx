"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { useTags, type TaggableEntity, type Tag } from "@/lib/stores/tags";

/**
 * TagInput — drop-in tag chip row with autocomplete.
 *
 *   <TagInput entity="deal" entityId={deal.id} />
 *
 * Reads + writes through `useTags` so a tag added on one record is
 * available everywhere. Existing assignments render as removable
 * coloured chips; a "+" trigger reveals an autocomplete popover that
 * filters known tags by typed query and offers "Create '<query>'"
 * when no exact match exists.
 */

export interface TagInputProps {
  entity: TaggableEntity;
  entityId: string;
  /** Visual size — `sm` for table rows, `md` for detail panels. */
  size?: "sm" | "md";
  /** Hide the "+" trigger when read-only. */
  readonly?: boolean;
}

export function TagInput({
  entity,
  entityId,
  size = "sm",
  readonly = false,
}: TagInputProps) {
  const allTags = useTags((s) => s.tags);
  const assignments = useTags((s) => s.assignments);
  const addTag = useTags((s) => s.addTag);
  const tagEntity = useTags((s) => s.tagEntity);
  const untagEntity = useTags((s) => s.untagEntity);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const applied = useMemo(() => {
    const ids = new Set(
      assignments
        .filter((a) => a.entity === entity && a.entityId === entityId)
        .map((a) => a.tagId),
    );
    return allTags.filter((t) => ids.has(t.id));
  }, [allTags, assignments, entity, entityId]);

  const candidates = useMemo<Tag[]>(() => {
    const q = query.toLowerCase();
    return allTags
      .filter((t) => t.entity === entity && !applied.some((a) => a.id === t.id))
      .filter((t) => !q || t.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allTags, entity, applied, query]);

  const exactMatch = useMemo(
    () =>
      query.trim() &&
      [...applied, ...candidates].some(
        (t) => t.label.toLowerCase() === query.trim().toLowerCase(),
      ),
    [query, applied, candidates],
  );

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      if (inputRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setQuery("");
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(tag: Tag) {
    tagEntity(entity, entityId, tag.id);
    setQuery("");
    setActiveIdx(0);
    inputRef.current?.focus();
  }

  function commitNew() {
    const label = query.trim();
    if (!label) return;
    const tag = addTag(entity, label);
    tagEntity(entity, entityId, tag.id);
    setQuery("");
    setActiveIdx(0);
  }

  const chipPad = size === "sm" ? "1px 7px" : "2px 9px";
  const chipFs = size === "sm" ? 10.5 : 11.5;

  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
        position: "relative",
        verticalAlign: "middle",
      }}
    >
      {applied.map((t) => (
        <span
          key={t.id}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: chipPad,
            borderRadius: 999,
            background: `${t.color}1A`,
            color: t.color,
            border: `1px solid ${t.color}55`,
            fontSize: chipFs,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {t.label}
          {!readonly && (
            <button
              type="button"
              onClick={() => untagEntity(entity, entityId, t.id)}
              aria-label={`Remove tag ${t.label}`}
              style={{
                width: 12,
                height: 12,
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={9} />
            </button>
          )}
        </span>
      ))}
      {!readonly && (
        <>
          <button
            ref={(el) => {
              // We piggyback the input ref on the trigger so focus lands here.
              if (el && !open) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el as unknown as HTMLInputElement;
            }}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Add tag"
            aria-expanded={open ? "true" : "false"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: chipPad,
              borderRadius: 999,
              border: "1px dashed var(--content-border)",
              background: "transparent",
              color: "var(--text-tertiary)",
              fontSize: chipFs,
              cursor: "pointer",
            }}
          >
            <Plus size={size === "sm" ? 9 : 11} />
            tag
          </button>
          {open && (
            <div
              ref={popRef}
              role="dialog"
              aria-label="Add tag"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 60,
                width: 240,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                borderRadius: 10,
                boxShadow: "var(--shadow-lg, 0 12px 28px rgba(0,0,0,0.18))",
                padding: 6,
              }}
            >
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) =>
                      Math.min(i + 1, Math.max(candidates.length - 1, 0)),
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (candidates[activeIdx]) commit(candidates[activeIdx]);
                    else if (query.trim() && !exactMatch) commitNew();
                  }
                }}
                placeholder="Find or create…"
                aria-label="Tag search"
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  outline: "none",
                  marginBottom: 4,
                }}
              />
              <ul
                role="listbox"
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                {candidates.map((t, i) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeIdx ? "true" : "false"}
                      onClick={() => commit(t)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: 6,
                        border: "none",
                        background:
                          i === activeIdx
                            ? "var(--content-secondary)"
                            : "transparent",
                        color: "var(--text-primary)",
                        fontSize: 12,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: t.color,
                        }}
                      />
                      {t.label}
                    </button>
                  </li>
                ))}
                {query.trim() && !exactMatch && (
                  <li>
                    <button
                      type="button"
                      onClick={commitNew}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "var(--vyne-accent, var(--vyne-purple))",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <TagIcon size={11} />
                      Create "{query.trim()}"
                    </button>
                  </li>
                )}
                {candidates.length === 0 && !query.trim() && (
                  <li
                    style={{
                      padding: "10px 8px",
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      textAlign: "center",
                    }}
                  >
                    Type to search or create a tag
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </span>
  );
}
