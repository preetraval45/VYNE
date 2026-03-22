import {
  type RunHistoryEntry,
  formatTimestamp,
  getRunStatusColor,
  getRunStatusLabel,
} from "./types";

export default function RunHistory(
  props: Readonly<{ history: RunHistoryEntry[] }>,
) {
  const { history } = props;

  if (history.length === 0) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "#A0A0B8",
          fontSize: 12,
        }}
      >
        No run history yet
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 80px 80px 80px",
          gap: 8,
          marginBottom: 8,
          padding: "0 4px",
        }}
      >
        {["Timestamp", "Status", "Duration", "Records"].map((col) => (
          <span
            key={col}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#A0A0B8",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {col}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {history.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px 80px",
              gap: 8,
              padding: "8px 4px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#6B6B8A" }}>
              {formatTimestamp(entry.timestamp)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: getRunStatusColor(entry.status),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: getRunStatusColor(entry.status),
                  fontWeight: 500,
                }}
              >
                {getRunStatusLabel(entry.status)}
              </span>
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#6B6B8A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {entry.duration}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#6B6B8A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {entry.recordsAffected}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
