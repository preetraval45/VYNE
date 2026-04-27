"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile,
  MessageSquare,
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  Languages,
  Pencil,
  Trash2,
  Check,
  CheckCheck,
  Pin,
  PinOff,
  X,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { MsgMessage } from "@/lib/api/client";
import { UserAvatar } from "./UserAvatar";
import { EmojiPicker } from "./EmojiPicker";
import { FileAttachment } from "./FileAttachment";
import { useSavedStore } from "@/lib/stores/saved";
import { useReadReceiptsStore } from "@/lib/stores/readReceipts";
import { usePinnedMessagesStore } from "@/lib/stores/pinnedMessages";
import { renderWithMentions, isUserMentioned } from "@/lib/utils/mentions";

interface MessageRowProps {
  readonly msg: MsgMessage;
  readonly prevMsg?: MsgMessage;
  readonly onReaction: (msgId: string, emoji: string) => void;
  readonly onReply: (msg: MsgMessage) => void;
  readonly isCurrentUser: boolean;
  readonly channelId?: string;
  readonly channelName?: string;
  readonly onEdit?: (msgId: string, newContent: string) => void;
  readonly onDelete?: (msgId: string) => void;
}

// ── Demo translation: maps common phrases. Wire to ai-service later. ──
const TRANSLATIONS: Record<string, string> = {
  hello: "Hola / Bonjour / こんにちは",
  hi: "Hola / Salut / やあ",
  thanks: "Gracias / Merci / ありがとう",
  "thank you": "Gracias / Merci / ありがとうございます",
  yes: "Sí / Oui / はい",
  no: "No / Non / いいえ",
  ok: "Vale / D'accord / OK",
  okay: "Vale / D'accord / OK",
  sorry: "Lo siento / Désolé / ごめんなさい",
  goodbye: "Adiós / Au revoir / さようなら",
  bye: "Adiós / Au revoir / バイバイ",
};

function generateTranslation(text: string): string {
  const lower = text.toLowerCase().trim();
  if (TRANSLATIONS[lower]) {
    return TRANSLATIONS[lower];
  }
  // Heuristic stub — in real product, call ai-service /translate endpoint
  return `[ES] ${text}\n[FR] ${text}\n[JP] ${text}\n\n(VYNE AI translation — demo mode)`;
}

export function MessageRow({
  msg,
  prevMsg,
  onReaction,
  onReply,
  isCurrentUser,
  channelId,
  channelName,
  onEdit,
  onDelete,
}: MessageRowProps) {
  const [hovering, setHovering] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const isSaved = useSavedStore((s) => s.isSaved(msg.id));
  const toggleSave = useSavedStore((s) => s.toggleSave);
  const isPinned = usePinnedMessagesStore((s) =>
    channelId ? s.isPinned(channelId, msg.id) : false,
  );
  const pinAction = usePinnedMessagesStore((s) => s.pin);
  const unpinAction = usePinnedMessagesStore((s) => s.unpin);
  // Subscribe to receipts store so the ✓/✓✓ indicator updates live
  // (cross-tab sync triggers re-render, plus simulated peer reads tick).
  const seenPeers = useReadReceiptsStore((s) =>
    isCurrentUser && channelId
      ? s.seenCount(channelId, msg.createdAt, "me")
      : 0,
  );

  // Reset draft if msg.content changes externally (e.g. server echo)
  useEffect(() => {
    if (!editing) setDraft(msg.content);
  }, [msg.content, editing]);

  // Focus + size the edit textarea on enter
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(
        editRef.current.value.length,
        editRef.current.value.length,
      );
    }
  }, [editing]);

  function handleSave() {
    toggleSave({
      messageId: msg.id,
      channelId: channelId ?? "unknown",
      channelName: channelName ?? "Unknown channel",
      authorName: msg.author.name,
      content: msg.content || "(attachment)",
    });
  }

  function handleTranslate() {
    if (translation) {
      setTranslation(null);
      return;
    }
    if (!msg.content) return;
    setTranslation(generateTranslation(msg.content));
  }

  function handleSaveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === msg.content) {
      setEditing(false);
      setDraft(msg.content);
      return;
    }
    onEdit?.(msg.id, trimmed);
    setEditing(false);
  }

  function handleCancelEdit() {
    setEditing(false);
    setDraft(msg.content);
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 4000);
      return;
    }
    onDelete?.(msg.id);
    setConfirmingDelete(false);
  }

  function handleTogglePin() {
    if (!channelId) return;
    if (isPinned) {
      unpinAction(channelId, msg.id);
    } else {
      pinAction(channelId, msg, "You");
    }
  }
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
                color: isCurrentUser
                  ? "var(--vyne-purple)"
                  : "var(--text-primary)",
              }}
            >
              {msg.author.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              {formatRelativeTime(msg.createdAt)}
            </span>
          </div>
        )}

        {msg.content && !editing && (
          <p
            style={{
              fontSize: 13,
              color: "var(--text-primary)",
              lineHeight: 1.6,
              margin: 0,
              wordBreak: "break-word",
              ...(isUserMentioned(msg.content, ["Preet", "You"])
                ? {
                    paddingLeft: 8,
                    borderLeft: "3px solid var(--vyne-purple)",
                    background: "rgba(108, 71, 255, 0.04)",
                    borderRadius: "0 4px 4px 0",
                  }
                : {}),
            }}
          >
            {renderWithMentions(msg.content)}
            {msg.updatedAt && (
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  marginLeft: 6,
                  fontStyle: "italic",
                }}
                title={`Edited ${new Date(msg.updatedAt).toLocaleString()}`}
              >
                (edited)
              </span>
            )}
          </p>
        )}

        {editing && (
          <div
            style={{
              border: "1px solid var(--vyne-purple)",
              borderRadius: 8,
              padding: 6,
              background: "var(--content-secondary)",
              marginTop: 2,
            }}
          >
            <textarea
              ref={editRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancelEdit();
                }
              }}
              rows={Math.min(6, Math.max(2, draft.split("\n").length))}
              style={{
                width: "100%",
                resize: "vertical",
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 13,
                lineHeight: 1.6,
                outline: "none",
                fontFamily: "inherit",
                padding: "4px 6px",
              }}
              aria-label="Edit message"
            />
            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: "flex-end",
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--content-border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!draft.trim() || draft.trim() === msg.content}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  background:
                    draft.trim() && draft.trim() !== msg.content
                      ? "var(--vyne-purple)"
                      : "var(--content-border)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor:
                    draft.trim() && draft.trim() !== msg.content
                      ? "pointer"
                      : "default",
                }}
              >
                Save
              </button>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                marginTop: 4,
                paddingLeft: 6,
              }}
            >
              Enter to save · Esc to cancel
            </div>
          </div>
        )}

        {/* Read receipts on own messages — WhatsApp-style ✓ / ✓✓ */}
        {isCurrentUser && msg.content && !editing && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 3,
              fontSize: 10,
              color:
                seenPeers > 0 ? "var(--vyne-purple)" : "var(--text-tertiary)",
              fontWeight: 500,
            }}
            title={
              seenPeers > 0
                ? `Seen by ${seenPeers} ${seenPeers === 1 ? "person" : "people"}`
                : "Sent"
            }
          >
            {seenPeers > 0 ? (
              <CheckCheck size={11} strokeWidth={2.5} />
            ) : (
              <Check size={11} strokeWidth={2.5} />
            )}
            <span>
              {seenPeers > 0
                ? `Seen${seenPeers > 1 ? ` · ${seenPeers}` : ""}`
                : "Sent"}
            </span>
          </div>
        )}

        {/* Inline translation panel */}
        {translation && (
          <div
            style={{
              marginTop: 6,
              padding: "8px 10px",
              borderLeft: "3px solid var(--vyne-purple)",
              background: "rgba(108, 71, 255, 0.06)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--text-secondary)",
              whiteSpace: "pre-line",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--vyne-purple)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Languages size={11} /> VYNE AI Translation
            </div>
            {translation}
          </div>
        )}

        {/* Saved indicator */}
        {isSaved && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
              padding: "2px 7px",
              borderRadius: 99,
              background: "rgba(245, 158, 11, 0.12)",
              color: "#D97706",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            <BookmarkCheck size={10} />
            Saved
          </div>
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
                type="button"
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
                    ? "rgba(6, 182, 212,0.1)"
                    : "var(--content-secondary)",
                  border: r.userReacted
                    ? "1px solid rgba(6, 182, 212,0.35)"
                    : "1px solid var(--content-border)",
                  color: r.userReacted ? "#06B6D4" : "var(--text-secondary)",
                }}
              >
                {r.emoji} <span style={{ fontWeight: 600 }}>{r.count}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEmojiOpen(true)}
              style={{
                padding: "2px 6px",
                borderRadius: 20,
                border: "1px dashed var(--content-border)",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-tertiary)",
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
            type="button"
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
              color: "#06B6D4",
              fontSize: 11,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(6, 182, 212,0.07)";
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
              border: "1px solid var(--content-border)",
              borderRadius: 8,
              padding: "3px 4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              zIndex: 10,
            }}
          >
            <div style={{ position: "relative" }}>
              <button
                type="button"
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
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--content-secondary)";
                  (e.currentTarget as HTMLElement).style.color = "#06B6D4";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-secondary)";
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
              type="button"
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
                (e.currentTarget as HTMLElement).style.background =
                  "var(--content-secondary)";
                (e.currentTarget as HTMLElement).style.color = "#06B6D4";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-secondary)";
              }}
            >
              <MessageSquare size={13} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              title={isSaved ? "Remove from saved" : "Save for later"}
              aria-label={isSaved ? "Remove from saved" : "Save for later"}
              style={{
                padding: "4px 6px",
                borderRadius: 6,
                border: "none",
                background: isSaved ? "rgba(245, 158, 11, 0.15)" : "transparent",
                cursor: "pointer",
                color: isSaved ? "#D97706" : "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                if (!isSaved) {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--content-secondary)";
                  (e.currentTarget as HTMLElement).style.color = "#D97706";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaved) {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-secondary)";
                }
              }}
            >
              {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            </button>
            {msg.content && (
              <button
                type="button"
                onClick={handleTranslate}
                title={translation ? "Hide translation" : "Translate"}
                aria-label="Translate message"
                style={{
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "none",
                  background: translation
                    ? "rgba(108, 71, 255, 0.12)"
                    : "transparent",
                  cursor: "pointer",
                  color: translation ? "var(--vyne-purple)" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  if (!translation) {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)";
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--vyne-purple)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!translation) {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-secondary)";
                  }
                }}
              >
                <Languages size={13} />
              </button>
            )}
            {channelId && (
              <button
                type="button"
                onClick={handleTogglePin}
                title={isPinned ? "Unpin from channel" : "Pin to channel"}
                aria-label={isPinned ? "Unpin message" : "Pin message"}
                style={{
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "none",
                  background: isPinned
                    ? "rgba(245, 158, 11, 0.15)"
                    : "transparent",
                  cursor: "pointer",
                  color: isPinned ? "#F59E0B" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  if (!isPinned) {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)";
                    (e.currentTarget as HTMLElement).style.color = "#F59E0B";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPinned) {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-secondary)";
                  }
                }}
              >
                {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
              </button>
            )}
            {isCurrentUser && onEdit && msg.content && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Edit message"
                aria-label="Edit message"
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
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--content-secondary)";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--vyne-purple)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-secondary)";
                }}
              >
                <Pencil size={13} />
              </button>
            )}
            {isCurrentUser && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title={confirmingDelete ? "Click again to confirm" : "Delete message"}
                aria-label="Delete message"
                style={{
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "none",
                  background: confirmingDelete
                    ? "rgba(239,68,68,0.15)"
                    : "transparent",
                  cursor: "pointer",
                  color: confirmingDelete ? "#EF4444" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  if (!confirmingDelete) {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)";
                    (e.currentTarget as HTMLElement).style.color = "#EF4444";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!confirmingDelete) {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-secondary)";
                  }
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              type="button"
              title="More"
              aria-label="More actions"
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
                (e.currentTarget as HTMLElement).style.background =
                  "var(--content-secondary)";
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
