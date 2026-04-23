"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Search, Settings, Sparkles, Zap, Bell } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import type { MsgMessage, MsgAttachment } from "@/lib/api/client";
import { slashCommandApi } from "@/lib/api/client";
import type { LocalMsg } from "./constants";
import { UserAvatar } from "./UserAvatar";
import { MessageRow } from "./MessageRow";
import { MessageComposer } from "./MessageComposer";
import { SummaryPanel } from "./SummaryPanel";
import { NotificationPanel } from "./NotificationPanel";
import { FileUploadZone } from "./FileUploadZone";
import { cmdOutput } from "./CommandCards";
import type { UploadedFile } from "@/hooks/useFileUpload";

interface ChatAreaProps {
  readonly channelId: string;
  readonly channelName: string;
  readonly isDM: boolean;
  readonly description?: string;
  readonly onOpenThread: (msg: MsgMessage) => void;
  readonly threadMsg: MsgMessage | null;
}

export function ChatArea({
  channelId,
  channelName,
  isDM,
  description,
  onOpenThread,
  threadMsg,
}: ChatAreaProps) {
  const {
    messages,
    loading,
    typingUsers,
    sendMessage,
    sendTyping,
    addReaction,
  } = useMessages(channelId, isDM);
  const [cmdMessages, setCmdMessages] = useState<LocalMsg[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  // Reset local state when switching channels
  useEffect(() => {
    setCmdMessages([]);
    setSummaryOpen(false);
    setNotifOpen(false);
  }, [channelId]);

  useEffect(() => {
    if (messages.length !== prevCount.current) {
      bottomRef.current?.scrollIntoView({
        behavior: messages.length > 5 ? "smooth" : "auto",
      });
      prevCount.current = messages.length;
    }
  }, [messages.length]);

  async function handleCommand(cmd: string, args: string) {
    if (cmd === "summarize") {
      setSummaryOpen(true);
      return;
    }

    // Execute real API calls for ERP commands
    const newMsg: LocalMsg = {
      id: `cmd-${Date.now()}`,
      cmd,
      args,
      ts: new Date().toISOString(),
      loading: true,
      pollVotes:
        cmd === "poll" ? { "Yes 👍": 3, "No 👎": 1, "Maybe 🤔": 2 } : undefined,
    };
    setCmdMessages((prev) => [...prev, newMsg]);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    // Wire to real APIs
    try {
      let result: { success: boolean; data: unknown; message: string } | null = null;

      switch (cmd) {
        case "approve-order":
          result = await slashCommandApi.approveOrder(args.trim() || "ORD-1042");
          break;
        case "stock-check":
          result = await slashCommandApi.stockCheck(args.trim() || "SKU-001");
          break;
        case "invoice":
          result = await slashCommandApi.createInvoice(args.trim() || "Acme Corp");
          break;
        case "create-task":
          result = await slashCommandApi.createTask(args.trim() || "New Task");
          break;
        case "assign-lead":
          result = await slashCommandApi.assignLead(args.trim() || "New Lead");
          break;
      }

      // Update the command message with real data
      if (result) {
        setCmdMessages((prev) =>
          prev.map((m) =>
            m.id === newMsg.id
              ? { ...m, loading: false, apiResult: result }
              : m,
          ),
        );
      } else {
        setCmdMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, loading: false } : m)),
        );
      }
    } catch {
      setCmdMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, loading: false } : m)),
      );
    }
  }

  function handlePollVote(msgId: string, opt: string) {
    setCmdMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || m.pollVoted) return m;
        const prev = m.pollVotes ?? {};
        return {
          ...m,
          pollVoted: true,
          pollVotes: { ...prev, [opt]: (prev[opt] ?? 0) + 1 },
        };
      }),
    );
  }

  // Convert UploadedFile[] to MsgAttachment[] and send
  const handleSendWithAttachments = useCallback(
    (text: string, uploadedFiles?: UploadedFile[]) => {
      let attachments: MsgAttachment[] | undefined;
      if (uploadedFiles && uploadedFiles.length > 0) {
        attachments = uploadedFiles.map((f) => ({
          id: f.id,
          url: f.url,
          key: f.key,
          filename: f.name,
          contentType: f.type,
          size: f.size,
        }));
      }
      sendMessage(text, undefined, attachments);
    },
    [sendMessage],
  );

  // Ref to the composer's file upload handler (set via FileUploadZone)
  const composerUploadRef = useRef<((files: File[]) => void) | null>(null);

  return (
    <FileUploadZone
      onFilesDropped={(droppedFiles) =>
        composerUploadRef.current?.(droppedFiles)
      }
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 18px",
            borderBottom: "1px solid #E8E8F0",
            flexShrink: 0,
            gap: 10,
          }}
        >
          {isDM ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserAvatar name={channelName} size={28} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {channelName}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Hash size={16} style={{ color: "var(--text-secondary)" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {channelName}
              </span>
              {description && (
                <>
                  <span style={{ color: "var(--content-border)", margin: "0 4px" }}>|</span>
                  <span style={{ fontSize: 12, color: "#A0A0B8" }}>
                    {description}
                  </span>
                </>
              )}
            </div>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <button
              onClick={() => setSummaryOpen((o) => !o)}
              title="AI Summary"
              style={{
                padding: "5px 9px",
                borderRadius: 7,
                border: summaryOpen
                  ? "1px solid rgba(6, 182, 212,0.4)"
                  : "1px solid transparent",
                background: summaryOpen
                  ? "rgba(6, 182, 212,0.08)"
                  : "transparent",
                cursor: "pointer",
                color: summaryOpen ? "#06B6D4" : "#A0A0B8",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              <Sparkles size={13} /> Summarize
            </button>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              title="Smart Notifications"
              style={{
                padding: "5px 9px",
                borderRadius: 7,
                border: notifOpen
                  ? "1px solid rgba(245,158,11,0.4)"
                  : "1px solid transparent",
                background: notifOpen
                  ? "rgba(245,158,11,0.08)"
                  : "transparent",
                cursor: "pointer",
                color: notifOpen ? "#F59E0B" : "#A0A0B8",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 500,
                position: "relative",
              }}
            >
              <Bell size={13} />
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: 4,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#EF4444",
                }}
              />
            </button>
            <button aria-label="Search"
              style={{
                padding: "5px",
                borderRadius: 7,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#A0A0B8",
                display: "flex",
              }}
              title="Search"
            >
              <Search size={15} />
            </button>
            <button aria-label="Settings"
              style={{
                padding: "5px",
                borderRadius: 7,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#A0A0B8",
                display: "flex",
              }}
              title="Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="content-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 18px 0",
            position: "relative",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "20px 0",
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "var(--content-secondary)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 12,
                        width: "20%",
                        background: "var(--content-secondary)",
                        borderRadius: 4,
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        height: 10,
                        width: "70%",
                        background: "var(--content-secondary)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  prevMsg={messages[i - 1]}
                  onReaction={addReaction}
                  onReply={onOpenThread}
                  isCurrentUser={
                    msg.author.id === "me" || msg.author.name === "Preet Raval"
                  }
                />
              ))}
              {cmdMessages.map((cm) => (
                <div
                  key={cm.id}
                  style={{ display: "flex", gap: 10, padding: "10px 0" }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(6, 182, 212,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Zap size={16} style={{ color: "#06B6D4" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#06B6D4",
                        }}
                      >
                        VYNE Bot
                      </span>
                      <span style={{ fontSize: 10, color: "#A0A0B8" }}>
                        /{cm.cmd} {cm.args}
                      </span>
                    </div>
                    {cmdOutput(cm, (opt) => handlePollVote(cm.id, opt))}
                  </div>
                </div>
              ))}
            </>
          )}

          {typingUsers.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 0",
                color: "#A0A0B8",
                fontSize: 11,
                fontStyle: "italic",
              }}
            >
              <span>
                {typingUsers.map((u) => u.name).join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing
              </span>
              <span style={{ display: "flex", gap: 2 }}>
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      delay: d * 0.2,
                    }}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#A0A0B8",
                      display: "inline-block",
                    }}
                  />
                ))}
              </span>
            </div>
          )}
          <div ref={bottomRef} style={{ height: 16 }} />
        </div>

        <div style={{ position: "relative" }}>
          <AnimatePresence>
            {summaryOpen && (
              <SummaryPanel
                onClose={() => setSummaryOpen(false)}
                messages={messages}
                channelName={channelName}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {notifOpen && (
              <NotificationPanel onClose={() => setNotifOpen(false)} />
            )}
          </AnimatePresence>
          <MessageComposer
            placeholder={
              isDM ? `Message ${channelName}` : `Message #${channelName}`
            }
            onSend={handleSendWithAttachments}
            onTyping={sendTyping}
            onCommand={handleCommand}
            onDroppedFilesRef={composerUploadRef}
          />
        </div>
      </div>
    </FileUploadZone>
  );
}
