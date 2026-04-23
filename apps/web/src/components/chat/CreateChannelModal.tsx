"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface CreateChannelModalProps {
  readonly onClose: () => void;
  readonly onCreate: (name: string, desc: string, priv: boolean) => void;
}

export function CreateChannelModal({
  onClose,
  onCreate,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const slug = name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: "var(--content-bg)",
          borderRadius: 14,
          width: 440,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            Create a channel
          </span>
          <button aria-label="Close"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              display: "flex",
              borderRadius: 6,
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
          Channels are where your team communicates. Best when organized around
          a topic.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="channel-name"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Name
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid var(--input-border)",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--content-secondary)",
            }}
          >
            <span style={{ padding: "0 10px", color: "var(--text-tertiary)", fontSize: 13 }}>
              #
            </span>
            <input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. marketing"
              style={{
                flex: 1,
                padding: "8px 10px 8px 0",
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 13,
                color: "var(--text-primary)",
              }}
            />
          </div>
          {slug && slug !== name.toLowerCase() && (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
              Channel will be created as #{slug}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="channel-desc"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Description{" "}
            <span style={{ fontWeight: 400, color: "#C0C0D8" }}>
              (optional)
            </span>
          </label>
          <input
            id="channel-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is this channel about?"
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--input-border)",
              borderRadius: 8,
              background: "var(--content-secondary)",
              outline: "none",
              fontSize: 13,
              color: "var(--text-primary)",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setIsPrivate(!isPrivate)}
              onKeyDown={(e) => e.key === " " && setIsPrivate(!isPrivate)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: isPrivate ? "var(--vyne-purple)" : "var(--content-border)",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
                flexShrink: 0,
                border: "none",
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--content-bg)",
                  position: "absolute",
                  top: 2,
                  left: isPrivate ? 18 : 2,
                  transition: "left 0.2s",
                }}
              />
            </button>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                Make private
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Only invited members can see this channel
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (slug) {
                onCreate(slug, desc, isPrivate);
                onClose();
              }
            }}
            disabled={!slug}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: slug ? "#06B6D4" : "var(--content-border)",
              color: slug ? "#fff" : "#A0A0B8",
              cursor: slug ? "pointer" : "default",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Create Channel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
