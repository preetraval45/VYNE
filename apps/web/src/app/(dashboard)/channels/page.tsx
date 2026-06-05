"use client";

// Channel directory (UI_UPGRADE_PLAN.md 6.4).
//
// /channels page — every public channel with member count + last
// activity + filter chips. Click "Join" to subscribe (calls the
// existing pin store) or "Open" to navigate to /chat?channel=id.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Hash,
  Users,
  Clock,
  Search as SearchIcon,
  Pin,
  Filter as FilterIcon,
} from "lucide-react";
import type { MsgChannel } from "@/lib/api/client";
import { messagingApi } from "@/lib/api/client";
import { usePinsStore } from "@/lib/stores/pins";
import { PageHeader } from "@/components/shared/Kit";

type Sort = "active" | "members" | "name";

function relTime(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "now";
  const days = Math.floor(ms / 86400000);
  if (days === 0) {
    const hours = Math.floor(ms / 3600000);
    if (hours === 0) {
      const mins = Math.floor(ms / 60000);
      return mins <= 1 ? "just now" : `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function ChannelsDirectoryPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<MsgChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<Sort>("active");
  const [showPrivate, setShowPrivate] = useState(false);
  const isPinned = usePinsStore((s) => s.isPinned);
  const pin = usePinsStore((s) => s.pin);
  const unpin = usePinsStore((s) => s.unpin);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const list = await messagingApi.listChannels();
        if (!cancel) setChannels(list?.data ?? []);
      } catch {
        if (!cancel) setChannels([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const visible = useMemo(() => {
    let list = channels;
    if (!showPrivate) list = list.filter((c) => !c.isPrivate);
    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q),
      );
    }
    const out = [...list];
    if (sort === "active") {
      out.sort(
        (a, b) =>
          new Date(b.lastMessageAt ?? 0).getTime() -
          new Date(a.lastMessageAt ?? 0).getTime(),
      );
    } else if (sort === "members") {
      out.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
    } else {
      out.sort((a, b) => a.name.localeCompare(b.name));
    }
    return out;
  }, [channels, filter, sort, showPrivate]);

  function togglePin(ch: MsgChannel) {
    const href = `/chat?channel=${encodeURIComponent(ch.id)}`;
    if (isPinned(href)) {
      unpin(href);
    } else {
      pin({
        href,
        label: `#${ch.name}`,
        module: "chat",
        icon: "Hash",
      });
    }
  }

  return (
    <div style={{ padding: "16px 24px 32px" }}>
      <PageHeader
        title="Channels"
        subtitle="Browse every public channel in the workspace"
        icon={<Hash size={18} aria-hidden="true" />}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 220,
            padding: "6px 10px",
            border: "1px solid var(--content-border)",
            borderRadius: 6,
            background: "var(--content-bg)",
          }}
        >
          <SearchIcon
            size={13}
            aria-hidden="true"
            color="var(--text-tertiary)"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search channels by name or description"
            aria-label="Filter channels"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid var(--content-border)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          {[
            { id: "active" as const, label: "Active" },
            { id: "members" as const, label: "Members" },
            { id: "name" as const, label: "A–Z" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                border: "none",
                background:
                  sort === s.id
                    ? "var(--vyne-accent, var(--vyne-purple))"
                    : "transparent",
                color: sort === s.id ? "#fff" : "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showPrivate}
            onChange={(e) => setShowPrivate(e.target.checked)}
          />
          Include private
        </label>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          <FilterIcon
            size={11}
            style={{ display: "inline" }}
            aria-hidden="true"
          />{" "}
          {visible.length} of {channels.length}
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Loading channels…
        </div>
      ) : visible.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--content-border)",
            borderRadius: 8,
            padding: 32,
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          No channels match those filters.
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 8,
          }}
        >
          {visible.map((ch) => {
            const pinned = isPinned(
              `/chat?channel=${encodeURIComponent(ch.id)}`,
            );
            return (
              <li
                key={ch.id}
                style={{
                  background: "var(--content-bg)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Hash
                    size={14}
                    aria-hidden="true"
                    color="var(--text-secondary)"
                  />
                  <strong style={{ fontSize: 14 }}>{ch.name}</strong>
                  {ch.isPrivate && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        background: "var(--content-elevated)",
                        border: "1px solid var(--content-border)",
                        borderRadius: 99,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      Private
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => togglePin(ch)}
                    aria-label={pinned ? "Unpin channel" : "Pin channel"}
                    title={pinned ? "Unpin" : "Pin to sidebar"}
                    style={{
                      marginLeft: "auto",
                      width: 24,
                      height: 24,
                      border: "none",
                      background: "transparent",
                      color: pinned
                        ? "var(--vyne-accent, var(--vyne-purple))"
                        : "var(--text-tertiary)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Pin size={13} fill={pinned ? "currentColor" : "none"} />
                  </button>
                </div>
                {ch.description && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      minHeight: 18,
                    }}
                  >
                    {ch.description}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Users size={11} aria-hidden="true" /> {ch.memberCount ?? 0}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={11} aria-hidden="true" />{" "}
                    {relTime(ch.lastMessageAt)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <Link
                    href={`/chat?channel=${encodeURIComponent(ch.id)}`}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      textAlign: "center",
                      border:
                        "1px solid var(--vyne-accent, var(--vyne-purple))",
                      borderRadius: 6,
                      background: "var(--vyne-accent, var(--vyne-purple))",
                      color: "#fff",
                      textDecoration: "none",
                    }}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      togglePin(ch);
                      router.push(`/chat?channel=${encodeURIComponent(ch.id)}`);
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      border: "1px solid var(--content-border)",
                      borderRadius: 6,
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    Pin & Open
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
