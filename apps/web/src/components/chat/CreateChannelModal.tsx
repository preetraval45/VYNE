"use client";

import { useState } from "react";
import { BottomSheetModal } from "@/components/shared/BottomSheetModal";

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
    <BottomSheetModal open onClose={onClose} title="Create a channel" maxWidth={440}>
      <div>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 16,
          }}
        >
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
            <span
              style={{
                padding: "0 10px",
                color: "var(--text-tertiary)",
                fontSize: 13,
              }}
            >
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
            <p
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
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
              aria-label={
                isPrivate ? "Make channel public" : "Make channel private"
              }
              onClick={() => setIsPrivate(!isPrivate)}
              onKeyDown={(e) => e.key === " " && setIsPrivate(!isPrivate)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: isPrivate
                  ? "var(--vyne-accent, var(--vyne-purple))"
                  : "var(--content-border)",
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
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
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
            type="button"
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
            type="button"
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
              background: slug ? "var(--vyne-accent, #06B6D4)" : "var(--content-border)",
              color: slug ? "#fff" : "var(--text-tertiary)",
              cursor: slug ? "pointer" : "default",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Create Channel
          </button>
        </div>
      </div>
    </BottomSheetModal>
  );
}
