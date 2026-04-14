"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useMessages } from "@/hooks/useMessages";
import type { MsgMessage } from "@/lib/api/client";
import { UserAvatar } from "./UserAvatar";
import { MessageRow } from "./MessageRow";
import { MessageComposer } from "./MessageComposer";

interface ThreadPanelProps {
  readonly parentMsg: MsgMessage;
  readonly onClose: () => void;
}

export function ThreadPanel({ parentMsg, onClose }: ThreadPanelProps) {
  const { messages, sendMessage, sendTyping, typingUsers } = useMessages(
    parentMsg.channelId ?? null,
    false,
  );
  const replies = messages.filter((m) => m.parentMessageId === parentMsg.id);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  return (
    <motion.div
      initial={{ x: 360 }}
      animate={{ x: 0 }}
      exit={{ x: 360 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        width: 360,
        minWidth: 360,
        borderLeft: "1px solid #E8E8F0",
        display: "flex",
        flexDirection: "column",
        background: "var(--content-bg)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #E8E8F0",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Thread
        </span>
        <button
          onClick={onClose}
          style={{
            padding: 4,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            display: "flex",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Parent message */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #F0F0F8",
          flexShrink: 0,
          background: "var(--content-secondary)",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <UserAvatar name={parentMsg.author.name} size={30} />
          <div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "baseline",
                marginBottom: 3,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                {parentMsg.author.name}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {formatRelativeTime(parentMsg.createdAt)}
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "#4A4A6A",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {parentMsg.content}
            </p>
          </div>
        </div>
        {replies.length > 0 && (
          <p
            style={{
              fontSize: 11,
              color: "#6C47FF",
              marginTop: 8,
              paddingLeft: 40,
            }}
          >
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </p>
        )}
      </div>

      {/* Replies */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}
      >
        {replies.map((r, i) => (
          <MessageRow
            key={r.id}
            msg={r}
            prevMsg={replies[i - 1]}
            onReaction={() => {}}
            onReply={() => {}}
            isCurrentUser={r.author.id === "me"}
          />
        ))}
        {replies.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No replies yet. Start a thread!
          </p>
        )}
        {typingUsers.length > 0 && (
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>
            {typingUsers[0].name} is typing…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <MessageComposer
        placeholder="Reply in thread…"
        onSend={(text) => sendMessage(text, parentMsg.id)}
        onTyping={sendTyping}
      />
    </motion.div>
  );
}
