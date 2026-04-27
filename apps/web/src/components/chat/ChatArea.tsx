"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Search,
  Settings,
  Sparkles,
  Zap,
  Bell,
  Phone,
  Video,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useCallStore } from "@/lib/stores/call";
import { useUnreadStore } from "@/lib/stores/unread";
import { useSentMessagesStore } from "@/lib/stores/sentMessages";
import { ScheduleMeetingModal } from "@/components/calendar/ScheduleMeetingModal";
import type { MsgMessage, MsgAttachment } from "@/lib/api/client";
import { slashCommandApi } from "@/lib/api/client";
import { useContactsStore } from "@/lib/stores/contacts";
import { useSalesStore } from "@/lib/stores/sales";
import { useActivityStore } from "@/lib/stores/activity";
import type { LocalMsg } from "./constants";
import { UserAvatar } from "./UserAvatar";
import { MessageRow } from "./MessageRow";
import { MessageComposer } from "./MessageComposer";
import { SummaryPanel } from "./SummaryPanel";
import { NotificationPanel } from "./NotificationPanel";
import { FileUploadZone } from "./FileUploadZone";
import { SmartReplies } from "./SmartReplies";
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
    editMessage,
    deleteMessage,
  } = useMessages(channelId, isDM);
  const [cmdMessages, setCmdMessages] = useState<LocalMsg[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const callStatus = useCallStore((s) => s.status);
  const startCall = useCallStore((s) => s.startCall);
  const [callMenuOpen, setCallMenuOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const callMenuRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  // Subscribe to the persist store for THIS channel so a reply sent from
  // the ThreadPanel (different useMessages instance) immediately refreshes
  // ChatArea's reply-count badge.
  const persistedForChannel = useSentMessagesStore(
    (s) => s.byChannel[channelId] ?? [],
  );

  // Close call menu on outside click
  useEffect(() => {
    if (!callMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (
        callMenuRef.current &&
        !callMenuRef.current.contains(e.target as Node)
      ) {
        setCallMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [callMenuOpen]);

  // Reset local state when switching channels + mark this channel as read
  useEffect(() => {
    setCmdMessages([]);
    setSummaryOpen(false);
    setNotifOpen(false);
    // Auto mark-as-read: clear immediately when a chat opens.
    if (channelId) {
      useUnreadStore.getState().markRead(channelId);
    }
  }, [channelId]);

  // Re-mark as read whenever new messages arrive while this chat is focused
  useEffect(() => {
    if (channelId && messages.length > 0) {
      useUnreadStore.getState().markRead(channelId);
    }
  }, [channelId, messages.length]);

  useEffect(() => {
    if (messages.length !== prevCount.current) {
      bottomRef.current?.scrollIntoView({
        behavior: messages.length > 5 ? "smooth" : "auto",
      });
      prevCount.current = messages.length;
    }
  }, [messages.length]);

  // ── CRM bridge: read/write Zustand stores synchronously ─────────
  function handleContactLookup(arg: string) {
    const query = arg.toLowerCase();
    const { contacts, addContact } = useContactsStore.getState();
    if (!query) {
      return {
        success: false,
        data: null,
        message: "Usage: /contact <email or name>",
      };
    }
    const found = contacts.find(
      (c) =>
        c.email.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query),
    );
    if (found) {
      return {
        success: true,
        data: {
          mode: "found" as const,
          contact: found,
        },
        message: `Found ${found.name} (${found.email}) at ${found.company}.`,
      };
    }
    // Not found — create stub
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(arg);
    const guessName = isEmail
      ? arg
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : arg
          .split(/\s+/)
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(" ");
    addContact({
      name: guessName,
      email: isEmail ? arg : `${guessName.toLowerCase().replace(/\s+/g, ".")}@unknown.com`,
      phone: "",
      company: "Unknown",
      accountId: "",
      title: "—",
      department: "—",
      lastContact: new Date().toISOString().slice(0, 10),
      tags: [],
    });
    return {
      success: true,
      data: {
        mode: "created" as const,
        name: guessName,
        email: isEmail ? arg : "—",
      },
      message: `Created new contact stub for ${guessName}. Open CRM to enrich.`,
    };
  }

  function handleCreateDeal(arg: string) {
    if (!arg) {
      return {
        success: false,
        data: null,
        message: "Usage: /deal <name> @ <company> $<value>",
      };
    }
    // Parse: "Acme renewal @ Acme Corp $25000" — flexible
    const valueMatch = arg.match(/\$\s*([\d,]+(?:\.\d+)?)/);
    const value = valueMatch
      ? Math.round(parseFloat(valueMatch[1].replace(/,/g, "")))
      : 0;
    const withoutValue = arg.replace(/\$\s*[\d,]+(?:\.\d+)?/, "").trim();
    const [name, company] = withoutValue.includes("@")
      ? withoutValue.split("@").map((s) => s.trim())
      : [withoutValue, "Unknown"];
    const dealName = name || "Untitled deal";
    const expected = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10);
    useSalesStore.getState().addDeal({
      name: dealName,
      company: company || "Unknown",
      contact: "—",
      value,
      probability: 25,
      stage: "Qualification",
      expectedClose: expected,
      assignee: "You",
    });
    return {
      success: true,
      data: {
        name: dealName,
        company: company || "Unknown",
        value,
        stage: "Qualification",
        expectedClose: expected,
      },
      message: `Deal "${dealName}" added to pipeline.`,
    };
  }

  function handleLogCall(arg: string) {
    if (!arg) {
      return {
        success: false,
        data: null,
        message: "Usage: /log-call <contact> | <notes>",
      };
    }
    const [contactPart, notesPart] = arg.includes("|")
      ? arg.split("|").map((s) => s.trim())
      : [arg, "Call logged from chat"];
    const { contacts } = useContactsStore.getState();
    const contact = contacts.find(
      (c) =>
        c.name.toLowerCase().includes(contactPart.toLowerCase()) ||
        c.email.toLowerCase().includes(contactPart.toLowerCase()),
    );
    const recordId = contact?.id ?? `unknown-${Date.now()}`;
    useActivityStore.getState().log({
      recordType: "contact",
      recordId,
      verb: "called",
      summary: `📞 Call with ${contact?.name ?? contactPart}: ${notesPart}`,
    });
    return {
      success: true,
      data: {
        contactName: contact?.name ?? contactPart,
        notes: notesPart,
        ts: new Date().toISOString(),
        matched: Boolean(contact),
      },
      message: contact
        ? `Call logged on ${contact.name}'s timeline.`
        : `Call logged (unmatched contact "${contactPart}").`,
    };
  }

  async function handleCommand(cmd: string, args: string) {
    if (cmd === "summarize") {
      setSummaryOpen(true);
      return;
    }
    if (cmd === "schedule") {
      setScheduleOpen(true);
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
      let result: { success: boolean; data: unknown; message: string } | null =
        null;

      switch (cmd) {
        case "approve-order":
          result = await slashCommandApi.approveOrder(
            args.trim() || "ORD-1042",
          );
          break;
        case "stock-check":
          result = await slashCommandApi.stockCheck(args.trim() || "SKU-001");
          break;
        case "invoice":
          result = await slashCommandApi.createInvoice(
            args.trim() || "Acme Corp",
          );
          break;
        case "create-task":
          result = await slashCommandApi.createTask(args.trim() || "New Task");
          break;
        case "assign-lead":
          result = await slashCommandApi.assignLead(args.trim() || "New Lead");
          break;
        case "contact":
          result = handleContactLookup(args.trim());
          break;
        case "deal":
          result = handleCreateDeal(args.trim());
          break;
        case "log-call":
          result = handleLogCall(args.trim());
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
            borderBottom: "1px solid var(--content-border)",
            flexShrink: 0,
            gap: 10,
          }}
        >
          {isDM ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserAvatar name={channelName} size={28} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {channelName}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Hash size={16} style={{ color: "var(--text-secondary)" }} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {channelName}
              </span>
              {description && (
                <>
                  <span
                    style={{ color: "var(--content-border)", margin: "0 4px" }}
                  >
                    |
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {description}
                  </span>
                </>
              )}
            </div>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {/* Call dropdown — Audio / Video options */}
            <div ref={callMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setCallMenuOpen((o) => !o)}
                disabled={callStatus !== "idle"}
                title="Start a call"
                aria-label="Start a call"
                aria-haspopup="menu"
                aria-expanded={callMenuOpen}
                style={{
                  padding: "6px 10px 6px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(108, 71, 255, 0.4)",
                  background: callMenuOpen
                    ? "rgba(108, 71, 255, 0.2)"
                    : "rgba(108, 71, 255, 0.12)",
                  cursor: callStatus === "idle" ? "pointer" : "not-allowed",
                  color: "var(--vyne-purple)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: callStatus === "idle" ? 1 : 0.5,
                  transition: "all 0.15s",
                }}
              >
                <Phone size={13} /> Call
                <ChevronDown
                  size={12}
                  style={{
                    transform: callMenuOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </button>
              {callMenuOpen && callStatus === "idle" && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    minWidth: 200,
                    background: "var(--content-bg)",
                    border: "1px solid var(--content-border)",
                    borderRadius: 10,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                    padding: 4,
                    zIndex: 50,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCallMenuOpen(false);
                      startCall(channelId, channelName, "voice");
                    }}
                    style={menuItemStyle("#22C55E")}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: "rgba(34,197,94,0.15)",
                        color: "#22C55E",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Phone size={13} />
                    </span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Audio call
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Voice only · uses mic
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCallMenuOpen(false);
                      startCall(channelId, channelName, "video");
                    }}
                    style={menuItemStyle("var(--vyne-purple)")}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: "rgba(108, 71, 255, 0.15)",
                        color: "var(--vyne-purple)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Video size={13} />
                    </span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Video call
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Camera + mic + screen share
                      </div>
                    </div>
                  </button>
                  <div
                    style={{
                      height: 1,
                      background: "var(--content-border)",
                      margin: "4px 6px",
                    }}
                  />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCallMenuOpen(false);
                      setScheduleOpen(true);
                    }}
                    style={menuItemStyle("#06B6D4")}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: "rgba(6, 182, 212, 0.15)",
                        color: "#06B6D4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Calendar size={13} />
                    </span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Schedule for later
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        Pick a time + invite attendees
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
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
                color: summaryOpen ? "#06B6D4" : "var(--text-tertiary)",
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
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              title="Smart Notifications"
              style={{
                padding: "5px 9px",
                borderRadius: 7,
                border: notifOpen
                  ? "1px solid rgba(245,158,11,0.4)"
                  : "1px solid transparent",
                background: notifOpen ? "rgba(245,158,11,0.08)" : "transparent",
                cursor: "pointer",
                color: notifOpen ? "#F59E0B" : "var(--text-tertiary)",
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
            <button
              type="button"
              aria-label="Search"
              style={{
                padding: "5px",
                borderRadius: 7,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                display: "flex",
              }}
              title="Search"
            >
              <Search size={15} />
            </button>
            <button
              type="button"
              aria-label="Settings"
              style={{
                padding: "5px",
                borderRadius: 7,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--text-tertiary)",
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
              {(() => {
                // Build a live reply-count map. Combine local useMessages
                // state with the persistent sent-messages store so a reply
                // typed in the ThreadPanel (separate hook instance) ticks
                // up the count here without a refresh.
                const seen = new Set(messages.map((m) => m.id));
                const allMessages = [
                  ...messages,
                  ...persistedForChannel.filter((m) => !seen.has(m.id)),
                ];
                const liveReplyCount: Record<string, number> = {};
                for (const m of allMessages) {
                  if (m.parentMessageId) {
                    liveReplyCount[m.parentMessageId] =
                      (liveReplyCount[m.parentMessageId] ?? 0) + 1;
                  }
                }
                const parents = messages.filter((m) => !m.parentMessageId);
                return parents.map((msg, i, arr) => (
                  <MessageRow
                    key={msg.id}
                    msg={{
                      ...msg,
                      // Live count beats the seeded mock value
                      replyCount: liveReplyCount[msg.id] ?? 0,
                    }}
                    prevMsg={arr[i - 1]}
                    onReaction={addReaction}
                    onReply={onOpenThread}
                    isCurrentUser={
                      msg.author.id === "me" ||
                      msg.author.name === "Preet Raval"
                    }
                    channelId={channelId}
                    channelName={channelName}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                  />
                ));
              })()}
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
                      <span
                        style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                      >
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
                color: "var(--text-tertiary)",
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
                      background: "var(--text-tertiary)",
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
          <SmartReplies
            messages={messages}
            onPick={(text) => sendMessage(text)}
          />
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

      <ScheduleMeetingModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        defaultChannelId={channelId}
        defaultChannelName={channelName}
        onScheduled={(ev) => {
          // Drop a meeting card into the chat
          const startD = new Date(ev.startsAt);
          const when = startD.toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const attendeeList =
            ev.attendees.length > 0
              ? `\nAttendees: ${ev.attendees.map((a) => a.name).join(", ")}`
              : "";
          sendMessage(
            `📅 *Meeting scheduled* — ${ev.title}\n${when}${attendeeList}${ev.videoCall ? "\n🎥 Video call · join from /calendar" : ""}`,
          );
        }}
      />

      {/* Call overlay + recap modal are mounted globally in DashboardLayout
          via <GlobalCallPanel /> so they survive page navigation. */}
    </FileUploadZone>
  );
}

function menuItemStyle(_accent: string): React.CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 7,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.12s",
  };
}
