import { Zap } from "lucide-react";
import { TEMPLATES } from "./types";

export default function CreateAutomationModal(
  props: Readonly<{
    onSelect: (templateId: string) => void;
    onCancel: () => void;
  }>,
) {
  const { onSelect, onCancel } = props;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(108,71,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Zap size={22} color="#6C47FF" />
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1A1A2E",
              margin: "0 0 6px",
            }}
          >
            New Automation
          </h2>
          <p style={{ fontSize: 13, color: "#6B6B8A", margin: 0 }}>
            Start from a template or build from scratch
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl.id)}
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 10,
                padding: "14px 14px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1A1A2E",
                  lineHeight: 1.3,
                }}
              >
                {tpl.label}
              </span>
              <span style={{ fontSize: 11, color: "#6B6B8A", lineHeight: 1.5 }}>
                {tpl.description}
              </span>
              {tpl.id !== "tpl-custom" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: "rgba(108,71,255,0.08)",
                    color: "#6C47FF",
                    borderRadius: 20,
                    padding: "2px 7px",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  <Zap size={8} /> {tpl.actions.length} action
                  {tpl.actions.length === 1 ? "" : "s"}
                </span>
              )}
              {tpl.id === "tpl-custom" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: "rgba(0,0,0,0.05)",
                    color: "#6B6B8A",
                    borderRadius: 20,
                    padding: "2px 7px",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  Blank
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center" }}>
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              color: "#A0A0B8",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
