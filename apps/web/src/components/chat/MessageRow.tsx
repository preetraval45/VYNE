"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, MessageSquare, MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { MsgMessage } from "@/lib/api/client";
import { UserAvatar } from "./UserAvatar";
import { EmojiPicker } from "./EmojiPicker";
import { FileAttachment } from "./FileAttachment";

interface MessageRowProps {
  readonly msg: MsgMessage;
  readonly prevMsg?: MsgMessage;
  readonly onReaction: (msgId: string, emoji: string) => void;
  readonly onReply: (msg: MsgMessage) => void;
  readonly isCurrentUser: boolean;
}

export function MessageRow({
  msg,
  prevMsg,
  onReaction,
  onReply,
  isCurrentUser,
}: MessageRowProps) {
  const [hovering, setHovering] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const sameAuthor =
    prevMsg?.author.id === msg.author.id &&
    new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() <
      300000;

  return (
    <article
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setEmojiOpen(false);
      }}
      style={{
        display: "flex",
        gap: 10,
        padding: "2px 0",
        paddingTop: sameAuthor ? 0 : 12,
        position: "relative",
      }}
    >
      {/* Avatar / spacer */}
      <div style={{ width: 36, flexShrink: 0 }}>
        {!sameAuthor && <UserAvatar name={msg.author.name} size={34} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!sameAuthor && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isCurrentUser ? "#6C47FF" : "#1A1A2E",
              }}
            >
              {msg.author.name}
            </span>
            <span style={{ fontSize: 11, color: "#A0A0B8" }}>
              {formatRelativeTime(msg.createdAt)}
            </span>
          </div>
        )}

        {msg.content && (
          <p
            style={{
              fontSize: 13,
              color: "#2D2D4E",
              lineHeight: 1.6,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {msg.content}
          </p>
        )}

        {/* File attachments */}
        {msg.attachments && msg.attachments.length > 0 && (
          <FileAttachment attachments={msg.attachments} />
        )}

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div
            style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}
          >
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReaction(msg.id, r.emoji)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: "pointer",
                  background: r.userReacted
                    ? "rgba(108,71,255,0.1)"
                    : "#F0F0F8",
                  border: r.userReacted
                    ? "1px solid rgba(108,71,255,0.35)"
                    : "1px solid #E8E8F0",
                  color: r.userReacted ? "#6C47FF" : "#6B6B8A",
                }}
              >
                {r.emoji} <span style={{ fontWeight: 600 }}>{r.count}</span>
              </button>
            ))}
            <button
              onClick={() => setEmojiOpen(true)}
              style={{
                padding: "2px 6px",
                borderRadius: 20,
                border: "1px dashed #E8E8F0",
                background: "transparent",
                cursor: "pointer",
                color: "#A0A0B8",
                fontSize: 12,
              }}
            >
              +
            </button>
          </div>
        )}

        {/* Reply count */}
        {(msg.replyCount ?? 0) > 0 && (
          <button
            onClick={() => onReply(msg)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 4,
              padding: "3px 8px",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#6C47FF",
              fontSize: 11,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(108,71,255,0.07)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <MessageSquare size={11} />
            {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            style={{
              position: "absolute",
              right: 0,
              top: -4,
              display: "flex",
              gap: 2,
              background: "var(--content-bg)",
              border: "1px solid #E8E8F0",
              borderRadius: 8,
              padding: "3px 4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              zIndex: 10,
            }}
          >
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setEmojiOpen(!emojiOpen)}
                title="React"
                style={{
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
                  (e.currentTarget as HTMLElement).style.color = "#6C47FF";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#6B6B8A";
                }}
              >
                <Smile size={13} />
              </button>
              {emojiOpen && (
                <EmojiPicker
                  onPick={(e) => onReaction(msg.id, e)}
                  onClose={() => setEmojiOpen(false)}
                />
              )}
            </div>
            <button
              onClick={() => onReply(msg)}
              title="Reply in thread"
              style={{
                padding: "4px 6px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
                (e.currentTarget as HTMLElement).style.color = "#6C47FF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color = "#6B6B8A";
              }}
            >
              <MessageSquare size={13} />
            </button>
            <button
              title="More"
              style={{
                padding: "4px 6px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F0F0F8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }}
            >
              <MoreHorizontal size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
