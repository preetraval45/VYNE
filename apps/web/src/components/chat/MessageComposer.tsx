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
  const [capturing, setCapturing] = useState<"audio" | "video" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCaptureComplete(media: CapturedMedia) {
    const extension = media.kind === "audio" ? "webm" : "webm";
    const prefix = media.kind === "audio" ? "voice-note" : "screen-recording";
    const filename = `${prefix}-${Date.now()}.${extension}`;
    const file = new File([media.blob], filename, { type: media.mimeType });
    uploadFiles([file]);
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
          const daysUntilMonday = ((1 - now.getDay() + 7) % 7) || 7;
          sendAt.setDate(sendAt.getDate() + daysUntilMonday);
          sendAt.setHours(9, 0, 0, 0);
          break;
        }
        default:
          sendAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      // Store scheduled message in localStorage for persistence
      const scheduled = JSON.parse(localStorage.getItem("vyne-scheduled-messages") || "[]");
      scheduled.push({ text: trimmed, sendAt: sendAt.toISOString(), scheduledFor });
      localStorage.setItem("vyne-scheduled-messages", JSON.stringify(scheduled));
      onSend(`📅 Scheduled for ${scheduledFor} (${sendAt.toLocaleString()}): ${trimmed}`);
      setScheduledFor(null);
    } else {
      onSend(trimmed, hasAttachments ? files : undefined);
    }
    setText("");
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
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
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
        borderTop: "1px solid #E8E8F0",
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
            color: "#6C47FF",
            background: "rgba(108,71,255,0.08)",
            padding: "4px 10px",
            borderRadius: 6,
          }}
        >
          <Clock size={11} />
          Scheduled: {scheduledFor}
          <button aria-label="Close"
            onClick={() => setScheduledFor(null)}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#6C47FF",
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
          border: `1px solid ${isSlash ? "var(--vyne-purple)" : "var(--content-border)"}`,
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
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: "6px 10px",
            borderBottom: "1px solid #F0F0F8",
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
                (e.currentTarget as HTMLElement).style.color = "#6C47FF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
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
                  files.length > 0 ? "rgba(108,71,255,0.1)" : "transparent",
                cursor: "pointer",
                color: files.length > 0 ? "#6C47FF" : "#A0A0B8",
                display: "flex",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#6C47FF";
              }}
              onMouseLeave={(e) => {
                if (files.length === 0)
                  (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
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
                  (e.currentTarget as HTMLElement).style.color = "var(--vyne-purple)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
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
                  (e.currentTarget as HTMLElement).style.color = "var(--vyne-purple)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
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
                  (e.currentTarget as HTMLElement).style.color = "#6C47FF";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
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
                (e.currentTarget as HTMLElement).style.color = "#6C47FF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
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
                    ? "rgba(108,71,255,0.1)"
                    : "transparent",
                  cursor: "pointer",
                  color: scheduleOpen ? "#6C47FF" : "#A0A0B8",
                  display: "flex",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#6C47FF";
                }}
                onMouseLeave={(e) => {
                  if (!scheduleOpen)
                    (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
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
                    border: "1px solid #E8E8F0",
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
                          "#F0F0F8";
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
            onClick={submit}
            disabled={!canSend}
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: "none",
              cursor: canSend ? "pointer" : "default",
              background: canSend ? "#6C47FF" : "#E8E8F0",
              color: canSend ? "#fff" : "#A0A0B8",
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
