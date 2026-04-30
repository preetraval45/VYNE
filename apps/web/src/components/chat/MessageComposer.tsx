"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Smile,
  Paperclip,
  Mic,
  MonitorUp,
  AtSign,
  X,
  Clock,
  Bold,
  Italic,
  Code,
  Zap,
} from "lucide-react";
import { SCHEDULE_OPTS, type SlashCmd } from "./constants";
import { EmojiPicker } from "./EmojiPicker";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { AttachmentPreview } from "./AttachmentPreview";
import { MediaCaptureRecorder, type CapturedMedia } from "./MediaCapture";
import { useFileUpload, ACCEPTED_EXTENSIONS } from "@/hooks/useFileUpload";
import type { UploadedFile } from "@/hooks/useFileUpload";

interface MessageComposerProps {
  readonly placeholder: string;
  readonly onSend: (text: string, attachments?: UploadedFile[]) => void;
  readonly onTyping: () => void;
  readonly onCommand?: (cmd: string, args: string) => void;
  /** Mutable ref that ChatArea sets so FileUploadZone can forward dropped files to the composer. */
  readonly onDroppedFilesRef?: React.MutableRefObject<
    ((files: File[]) => void) | null
  >;
}

export function MessageComposer({
  placeholder,
  onSend,
  onTyping,
  onCommand,
  onDroppedFilesRef,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [capturing, setCapturing] = useState<"audio" | "video" | null>(null);
  const [critical, setCritical] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention candidates — eventually wire to org members; demo data for now.
  const mentionPool = [
    { id: "u2", name: "Sarah K." },
    { id: "u3", name: "Tony M." },
    { id: "u4", name: "Alex R." },
    { id: "u5", name: "Jordan B." },
    { id: "p-priya", name: "Priya Shah" },
    { id: "p-marcus", name: "Marcus Johnson" },
    { id: "p-amit", name: "Amit Patel" },
    { id: "channel", name: "channel" },
    { id: "here", name: "here" },
  ];

  const mentionMatches =
    mentionQuery !== null
      ? mentionPool
          .filter((m) =>
            m.name.toLowerCase().startsWith(mentionQuery.toLowerCase()),
          )
          .slice(0, 6)
      : [];

  function handleCaptureComplete(media: CapturedMedia) {
    const extension = media.kind === "audio" ? "webm" : "webm";
    const prefix = media.kind === "audio" ? "voice-note" : "screen-recording";
    const filename = `${prefix}-${Date.now()}.${extension}`;
    const file = new File([media.blob], filename, { type: media.mimeType });
    uploadFiles([file]);
    // If the recording captured a Web Speech API transcript, prefill the
    // composer with it so the user can edit + send (or just send) it
    // alongside the audio attachment.
    if (media.transcript && media.transcript.length > 0) {
      setText((prev) => {
        const sep = prev.trim() ? "\n\n" : "";
        return `${prev}${sep}🎙 ${media.transcript}`;
      });
    }
    setCapturing(null);
  }

  const { files, uploads, uploadFiles, removeFile, clearFiles, isUploading } =
    useFileUpload();

  // Expose uploadFiles to parent (for drag-and-drop forwarding from FileUploadZone)
  useEffect(() => {
    if (onDroppedFilesRef) {
      onDroppedFilesRef.current = (droppedFiles: File[]) => {
        uploadFiles(droppedFiles);
      };
    }
    return () => {
      if (onDroppedFilesRef) onDroppedFilesRef.current = null;
    };
  }, [onDroppedFilesRef, uploadFiles]);

  // Listen for the global drop overlay's "vyne:files-dropped" event
  // (fired by GlobalDropZone whenever the user drags files anywhere
  // over the dashboard). The composer is the most-likely intent for a
  // drop while on /chat; we attach the files as if the user clicked
  // the paperclip + picked them.
  useEffect(() => {
    function onGlobalDrop(e: Event) {
      const detail = (e as CustomEvent<{ files: File[] }>).detail;
      if (!detail?.files?.length) return;
      uploadFiles(detail.files);
    }
    window.addEventListener("vyne:files-dropped", onGlobalDrop);
    return () => window.removeEventListener("vyne:files-dropped", onGlobalDrop);
  }, [uploadFiles]);

  const isSlash = text.startsWith("/") && !text.includes(" ");

  function submit() {
    const hasAttachments = files.length > 0;
    if (!text.trim() && !hasAttachments) return;
    if (isUploading) return; // don't send while uploading

    const trimmed = text.trim();
    if (trimmed.startsWith("/")) {
      const [rawCmd, ...rest] = trimmed.slice(1).split(" ");
      const cmd = rawCmd.toLowerCase();
      if (cmd === "summarize") {
        onCommand?.(cmd, "");
      } else {
        onCommand?.(cmd, rest.join(" "));
      }
    } else if (scheduledFor) {
      // Calculate actual scheduled time
      const now = new Date();
      let sendAt: Date;
      switch (scheduledFor) {
        case "In 1 hour":
          sendAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case "Tomorrow 9am": {
          sendAt = new Date(now);
          sendAt.setDate(sendAt.getDate() + 1);
          sendAt.setHours(9, 0, 0, 0);
          break;
        }
        case "Monday 9am": {
          sendAt = new Date(now);
          const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
          sendAt.setDate(sendAt.getDate() + daysUntilMonday);
          sendAt.setHours(9, 0, 0, 0);
          break;
        }
        default:
          sendAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      // Store scheduled message in localStorage for persistence
      const scheduled = JSON.parse(
        localStorage.getItem("vyne-scheduled-messages") || "[]",
      );
      scheduled.push({
        text: trimmed,
        sendAt: sendAt.toISOString(),
        scheduledFor,
      });
      localStorage.setItem(
        "vyne-scheduled-messages",
        JSON.stringify(scheduled),
      );
      onSend(
        `📅 Scheduled for ${scheduledFor} (${sendAt.toLocaleString()}): ${trimmed}`,
      );
      setScheduledFor(null);
    } else {
      const finalText = critical ? `[!critical] ${trimmed}` : trimmed;
      onSend(finalText, hasAttachments ? files : undefined);
    }
    setText("");
    setCritical(false);
    clearFiles();
    setSlashMenuOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (
      slashMenuOpen &&
      (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")
    )
      return;
    if (e.key === "Escape" && slashMenuOpen) {
      setSlashMenuOpen(false);
      return;
    }
    // Mention picker keyboard nav
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx(
          (i) => (i - 1 + mentionMatches.length) % mentionMatches.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionMatches[mentionIdx].name);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setText(val);
    onTyping();
    setSlashMenuOpen(val.startsWith("/") && !val.includes(" "));

    // Detect a fresh @ token at the cursor → open mention picker.
    // We look back from the caret for an @ not preceded by another word char.
    const caret = e.target.selectionStart ?? val.length;
    const before = val.slice(0, caret);
    const m = before.match(/(?:^|\s)@([\w.-]*)$/);
    if (m) {
      setMentionQuery(m[1]);
      setMentionIdx(0);
    } else {
      setMentionQuery(null);
    }

    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  function insertMention(name: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const after = text.slice(caret);
    // Replace the trailing `@partial` we matched with `@FullName `
    const updated = before.replace(/@([\w.-]*)$/, `@${name} `) + after;
    setText(updated);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      ta.focus();
      const newCaret =
        before.replace(/@([\w.-]*)$/, `@${name} `).length;
      ta.setSelectionRange(newCaret, newCaret);
    });
  }

  function insertEmoji(emoji: string) {
    setText((t) => t + emoji);
    textareaRef.current?.focus();
  }

  function selectSlashCmd(c: SlashCmd) {
    const filled = c.args ? `/${c.cmd} ` : `/${c.cmd}`;
    setText(filled);
    setSlashMenuOpen(false);
    textareaRef.current?.focus();
  }

  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      uploadFiles(Array.from(selected));
    }
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasText = text.trim().length > 0;
  const hasContent = hasText || files.length > 0;
  const canSend = hasContent && !isUploading;

  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--content-border)",
        flexShrink: 0,
      }}
    >
      {scheduledFor && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
            fontSize: 11,
            color: "var(--vyne-accent, #06B6D4)",
            background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)",
            padding: "4px 10px",
            borderRadius: 6,
          }}
        >
          <Clock size={11} />
          Scheduled: {scheduledFor}
          <button
            aria-label="Close"
            onClick={() => setScheduledFor(null)}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--vyne-accent, #06B6D4)",
              display: "flex",
              padding: 0,
            }}
          >
            <X size={11} />
          </button>
        </div>
      )}
      <div
        style={{
          position: "relative",
          border: `1px solid ${isSlash ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
          borderRadius: 10,
          background: "var(--content-secondary)",
          overflow: "visible",
          transition: "border-color 0.15s",
        }}
      >
        {slashMenuOpen && (
          <SlashCommandMenu
            query={text}
            onSelect={selectSlashCmd}
            onClose={() => setSlashMenuOpen(false)}
          />
        )}

        {/* @mention autocomplete */}
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div
            role="listbox"
            aria-label="Mention picker"
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              minWidth: 240,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 10,
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
              padding: 4,
              zIndex: 50,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                padding: "6px 10px 4px",
              }}
            >
              Mention
            </div>
            {mentionMatches.map((m, i) => (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={i === mentionIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m.name);
                }}
                onMouseEnter={() => setMentionIdx(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 7,
                  border: "none",
                  background:
                    i === mentionIdx
                      ? "rgba(108, 71, 255, 0.12)"
                      : "transparent",
                  color: "var(--text-primary)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background:
                      m.id === "channel" || m.id === "here"
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(108, 71, 255, 0.15)",
                    color:
                      m.id === "channel" || m.id === "here"
                        ? "#F59E0B"
                        : "var(--vyne-accent, var(--vyne-purple))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  @
                </span>
                {m.name}
                {(m.id === "channel" || m.id === "here") && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {m.id === "channel"
                      ? "Notify everyone"
                      : "Notify online users"}
                  </span>
                )}
              </button>
            ))}
            <div
              style={{
                fontSize: 9,
                color: "var(--text-tertiary)",
                padding: "4px 10px 6px",
              }}
            >
              ↑↓ navigate · ↵ insert · esc close
            </div>
          </div>
        )}
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: "6px 10px",
            borderBottom: "1px solid var(--content-bg-secondary)",
          }}
        >
          {[
            {
              icon: <Bold size={13} />,
              title: "Bold",
              action: () => setText((t) => `**${t}**`),
            },
            {
              icon: <Italic size={13} />,
              title: "Italic",
              action: () => setText((t) => `_${t}_`),
            },
            {
              icon: <Code size={13} />,
              title: "Code",
              action: () => setText((t) => `\`${t}\``),
            },
            {
              icon: <Zap size={13} />,
              title: "Slash command",
              action: () => {
                setText("/");
                setSlashMenuOpen(true);
                textareaRef.current?.focus();
              },
            },
          ].map(({ icon, title, action }) => (
            <button
              key={title}
              onClick={action}
              title={title}
              style={{
                padding: "3px 6px",
                borderRadius: 5,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#EEEEF8";
                (e.currentTarget as HTMLElement).style.color = "var(--vyne-accent, #06B6D4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-tertiary)";
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: 13,
            color: "var(--text-primary)",
            lineHeight: 1.6,
            fontFamily: "Inter, system-ui",
            maxHeight: 180,
            boxSizing: "border-box",
          }}
        />

        {/* Attachment previews */}
        <AttachmentPreview
          files={files}
          uploads={uploads}
          onRemove={removeFile}
        />

        {/* Live recording banner */}
        {capturing && (
          <div style={{ marginTop: 8 }}>
            <MediaCaptureRecorder
              kind={capturing}
              onComplete={handleCaptureComplete}
              onCancel={() => setCapturing(null)}
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileInputChange}
          aria-label="Attach files"
          title="Attach files"
          style={{ display: "none" }}
        />

        {/* Bottom toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "6px 10px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 2, position: "relative" }}>
            <button
              onClick={handleFileSelect}
              title="Attach file"
              style={{
                padding: "4px 6px",
                borderRadius: 6,
                border: "none",
                background:
                  files.length > 0 ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)" : "transparent",
                cursor: "pointer",
                color: files.length > 0 ? "var(--vyne-accent, #06B6D4)" : "var(--text-tertiary)",
                display: "flex",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--vyne-accent, #06B6D4)";
              }}
              onMouseLeave={(e) => {
                if (files.length === 0)
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-tertiary)";
              }}
            >
              <Paperclip size={15} />
            </button>
            <button
              type="button"
              aria-label="Record voice note"
              onClick={() => setCapturing("audio")}
              disabled={capturing !== null}
              style={{
                padding: "4px 6px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                cursor: capturing !== null ? "default" : "pointer",
                color: "var(--text-tertiary)",
                display: "flex",
                opacity: capturing !== null ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (capturing === null) {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--vyne-accent, var(--vyne-purple))";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-tertiary)";
              }}
            >
              <Mic size={15} />
            </button>
            <button
              type="button"
              aria-label="Record screen"
              onClick={() => setCapturing("video")}
              disabled={capturing !== null}
              style={{
                padding: "4px 6px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                cursor: capturing !== null ? "default" : "pointer",
                color: "var(--text-tertiary)",
                display: "flex",
                opacity: capturing !== null ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (capturing === null) {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--vyne-accent, var(--vyne-purple))";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-tertiary)";
              }}
            >
              <MonitorUp size={15} />
            </button>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setEmojiOpen(!emojiOpen)}
                title="Emoji"
                style={{
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  display: "flex",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--vyne-accent, #06B6D4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-tertiary)";
                }}
              >
                <Smile size={15} />
              </button>
              {emojiOpen && (
                <EmojiPicker
                  onPick={insertEmoji}
                  onClose={() => setEmojiOpen(false)}
                />
              )}
            </div>
            <button
              title="Mention"
              style={{
                padding: "4px 6px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                display: "flex",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--vyne-accent, #06B6D4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-tertiary)";
              }}
            >
              <AtSign size={15} />
            </button>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setScheduleOpen(!scheduleOpen)}
                title="Schedule send"
                style={{
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "none",
                  background: scheduleOpen
                    ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)"
                    : "transparent",
                  cursor: "pointer",
                  color: scheduleOpen ? "var(--vyne-accent, #06B6D4)" : "var(--text-tertiary)",
                  display: "flex",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--vyne-accent, #06B6D4)";
                }}
                onMouseLeave={(e) => {
                  if (!scheduleOpen)
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-tertiary)";
                }}
              >
                <Clock size={15} />
              </button>
              {scheduleOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: 0,
                    background: "var(--content-bg)",
                    border: "1px solid var(--content-border)",
                    borderRadius: 8,
                    padding: 6,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                    minWidth: 150,
                    zIndex: 50,
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      margin: "0 4px 5px",
                    }}
                  >
                    Schedule send
                  </p>
                  {SCHEDULE_OPTS.map((opt) => (
                    <button
                      key={opt}
                      onMouseDown={() => {
                        setScheduledFor(opt);
                        setScheduleOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        borderRadius: 5,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--text-primary)",
                        textAlign: "left",
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
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCritical((v) => !v)}
            aria-pressed={critical}
            aria-label="Mark as critical (request read receipts)"
            title={
              critical
                ? "Marked critical — read receipts on"
                : "Mark as critical (track who has read it)"
            }
            style={{
              padding: "5px 9px",
              borderRadius: 7,
              border: `1px solid ${critical ? "#EF4444" : "var(--content-border)"}`,
              cursor: "pointer",
              background: critical ? "#EF4444" : "transparent",
              color: critical ? "#fff" : "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11.5,
              fontWeight: 600,
              transition: "all 0.1s",
            }}
          >
            🚨 {critical ? "Critical" : ""}
          </button>

          <button
            onClick={submit}
            disabled={!canSend}
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: "none",
              cursor: canSend ? "pointer" : "default",
              background: canSend ? "var(--vyne-accent, #06B6D4)" : "var(--content-border)",
              color: canSend ? "#fff" : "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.1s",
            }}
          >
            <Send size={13} /> {scheduledFor ? "Schedule" : "Send"}
          </button>
        </div>
      </div>
      <p
        style={{ fontSize: 10, color: "#C0C0D8", marginTop: 4, paddingLeft: 2 }}
      >
        Enter to send · Shift+Enter for new line · Type / for commands · Drag
        &amp; drop files to attach
      </p>
    </div>
  );
}
