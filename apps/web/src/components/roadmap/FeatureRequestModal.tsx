"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ALL_MODULES, type Module, type Priority } from "./roadmapData";

interface FeatureRequestModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}

export function FeatureRequestModal({
  open,
  onClose,
  onSubmit,
}: FeatureRequestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState<Module>("Chat");
  const [priority, setPriority] = useState<Priority>("medium");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
    setTitle("");
    setDescription("");
    setModule("Chat");
    setPriority("medium");
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-primary, var(--text-primary))",
    marginBottom: 4,
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--content-border, var(--content-border))",
    fontSize: 13,
    outline: "none",
    background: "var(--content-secondary, var(--content-bg-secondary))",
    color: "var(--text-primary, var(--text-primary))",
    boxSizing: "border-box",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "var(--content-bg, #fff)",
          borderRadius: 14,
          padding: 0,
          width: 460,
          maxWidth: "90vw",
          zIndex: 1001,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom:
              "1px solid var(--content-border, var(--content-border))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
            Request a Feature
          </span>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        {/* Modal body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Title */}
          <div>
            <label style={labelStyle}>Feature Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., AI-powered invoice matching"
              style={inputStyle}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature and how it would help your workflow..."
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "inherit",
              }}
              required
            />
          </div>

          {/* Module + Priority row */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Module</label>
              <select
                aria-label="Select option"
                value={module}
                onChange={(e) => setModule(e.target.value as Module)}
                style={inputStyle}
              >
                {ALL_MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Priority Suggestion</label>
              <select
                aria-label="Select option"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                style={inputStyle}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border:
                  "1px solid var(--content-border, var(--content-border))",
                background: "var(--content-bg, #fff)",
                color: "var(--text-secondary, var(--text-secondary))",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #06B6D4, #8B5CF6)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
