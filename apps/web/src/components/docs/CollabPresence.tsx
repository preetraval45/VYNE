"use client";

import type { CollabUser } from "./useCollab";

interface Props {
  users: CollabUser[];
  status: "connecting" | "connected" | "disconnected";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CollabPresence({ users, status }: Props) {
  const statusColor =
    status === "connected"
      ? "var(--status-success)"
      : status === "connecting"
        ? "var(--status-warning)"
        : "var(--status-danger)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      aria-label="Collaborators"
    >
      {/* Connection indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          borderRadius: 999,
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-secondary)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: statusColor,
            boxShadow: `0 0 0 2px ${statusColor}22`,
          }}
        />
        {status === "connected"
          ? users.length === 0
            ? "Only you"
            : `${users.length + 1} editing`
          : status === "connecting"
            ? "Connecting…"
            : "Offline"}
      </div>

      {/* Avatar stack (max 4) */}
      {users.length > 0 && (
        <div style={{ display: "flex" }}>
          {users.slice(0, 4).map((u, idx) => (
            <div
              key={u.id}
              title={u.name}
              aria-label={u.name}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: u.color,
                border: "2px solid var(--content-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 10,
                fontWeight: 600,
                marginLeft: idx === 0 ? 0 : -8,
                zIndex: users.length - idx,
              }}
            >
              {initials(u.name)}
            </div>
          ))}
          {users.length > 4 && (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--content-secondary)",
                border: "2px solid var(--content-bg)",
                color: "var(--text-secondary)",
                fontSize: 10,
                fontWeight: 600,
                marginLeft: -8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +{users.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
