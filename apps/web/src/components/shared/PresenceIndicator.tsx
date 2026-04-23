"use client";

import { useEffect, useState } from "react";

interface PresenceUser {
  id: string;
  name: string;
  color?: string;
  lastSeen: string;
}

interface Props {
  /** Stable subject — e.g. `issue:ENG-43`, `doc:123`, `channel:#alerts`. */
  subjectId: string;
  /** Short label — e.g. "viewing", "editing". */
  verb?: string;
  /** Max avatars to show before +N. */
  max?: number;
}

const STORAGE_PREFIX = "vyne-presence-";
const STALE_MS = 45_000; // drop users who haven't pinged in 45s

const DEMO_USERS: PresenceUser[] = [
  { id: "demo-1", name: "Sarah Kim", color: "#22C55E", lastSeen: "" },
  { id: "demo-2", name: "Tony Marquez", color: "#F59E0B", lastSeen: "" },
  { id: "demo-3", name: "Maya Okonkwo", color: "#EC4899", lastSeen: "" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function loadRaw(id: string): PresenceUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return [];
    const users = JSON.parse(raw) as PresenceUser[];
    const now = Date.now();
    return users.filter(
      (u) => now - new Date(u.lastSeen).getTime() < STALE_MS,
    );
  } catch {
    return [];
  }
}

export function PresenceIndicator({
  subjectId,
  verb = "viewing",
  max = 3,
}: Props) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    // Seed with demo users so the indicator always has something to show in demo mode.
    const now = new Date().toISOString();
    const seeded = DEMO_USERS.slice(
      0,
      (Math.abs(hash(subjectId)) % 3) + 1,
    ).map((u) => ({ ...u, lastSeen: now }));
    setUsers(seeded);

    // Listen for real updates across tabs (if the backend ever starts posting them).
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_PREFIX + subjectId) {
        setUsers(loadRaw(subjectId));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [subjectId]);

  if (users.length === 0) return null;

  const shown = users.slice(0, max);
  const extra = users.length - shown.length;

  return (
    <div
      aria-label={`${users.length} ${verb}`}
      title={users.map((u) => u.name).join(", ") + ` · ${verb}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 10px 2px 4px",
        borderRadius: 999,
        background: "var(--content-secondary)",
        border: "1px solid var(--content-border)",
      }}
    >
      <div style={{ display: "flex" }}>
        {shown.map((u, idx) => (
          <div
            key={u.id}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: u.color ?? "#06B6D4",
              border: "2px solid var(--content-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              marginLeft: idx === 0 ? 0 : -7,
              zIndex: shown.length - idx,
              position: "relative",
            }}
            aria-hidden="true"
          >
            {initials(u.name)}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: -1,
                bottom: -1,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22C55E",
                border: "1.5px solid var(--content-bg)",
              }}
            />
          </div>
        ))}
        {extra > 0 && (
          <div
            aria-hidden="true"
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "var(--content-bg)",
              border: "2px solid var(--content-bg)",
              color: "var(--text-secondary)",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: -7,
            }}
          >
            +{extra}
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          fontWeight: 600,
        }}
      >
        {users.length} {verb}
      </span>
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
