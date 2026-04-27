"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { useChannels } from "@/hooks/useMessages";
import type { MsgMessage } from "@/lib/api/client";
import { ChannelSidebar } from "@/components/chat/ChannelSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { ThreadPanel } from "@/components/chat/ThreadPanel";
import { SkeletonList } from "@/components/shared/Skeleton";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

export default function ChatPage() {
  const router = useRouter();
  const { channels, dms, loading } = useChannels();
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [isDM, setIsDM] = useState(false);
  const [threadMsg, setThreadMsg] = useState<MsgMessage | null>(null);
  const isMobile = useIsMobile();
  // On mobile, default to showing the channel list (no chat selected)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const channelName = isDM
    ? (dms.find((d) => d.id === selectedId)?.participant.name ?? "")
    : (channels.find((c) => c.id === selectedId)?.name ?? "");

  const channelDescription = isDM
    ? undefined
    : channels.find((c) => c.id === selectedId)?.description;

  function selectChannel(id: string, dm = false) {
    setSelectedId(id);
    setIsDM(dm);
    setThreadMsg(null);
    if (isMobile) setMobileView("chat");
  }

  // Mobile: show channel list OR chat, never both. Desktop: show both side-by-side.
  const showSidebar = !isMobile || mobileView === "list";
  const showChat = !isMobile || mobileView === "chat";

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "var(--content-bg)",
      }}
    >
      {/* ── Channel sidebar (or skeleton while loading) ───────── */}
      {showSidebar && (
        loading && channels.length === 0 ? (
          <div
            className="chat-channel-list"
            style={{
              width: isMobile ? "100%" : 260,
              borderRight: "1px solid var(--content-border)",
              padding: 14,
              background: "var(--content-bg)",
            }}
          >
            <SkeletonList items={6} avatarSize={20} />
          </div>
        ) : (
          <div
            className="chat-channel-list"
            style={{
              width: isMobile ? "100%" : "auto",
              flexShrink: 0,
              display: "flex",
            }}
          >
            <ChannelSidebar
              channels={channels}
              dms={dms}
              selectedId={selectedId}
              isDM={isDM}
              onSelectChannel={selectChannel}
              onCreateChannel={() => router.push("/chat/new")}
            />
          </div>
        )
      )}

      {/* ── Main area ─────────────────────────────────── */}
      {showChat && selectedId ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
            minWidth: 0,
            flexDirection: "column",
          }}
        >
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileView("list")}
              aria-label="Back to channels"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 14px",
                background: "var(--content-secondary)",
                border: "none",
                borderBottom: "1px solid var(--content-border)",
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={15} /> Channels
            </button>
          )}
          <div
            style={{
              flex: 1,
              display: "flex",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <ChatArea
              channelId={selectedId}
              channelName={channelName}
              isDM={isDM}
              description={channelDescription}
              onOpenThread={(msg) => setThreadMsg(msg)}
              threadMsg={threadMsg}
            />

            {/* Thread panel */}
            <AnimatePresence>
              {threadMsg && (
                <ThreadPanel
                  parentMsg={threadMsg}
                  onClose={() => setThreadMsg(null)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : showChat && !isMobile ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "rgba(6, 182, 212,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageSquare size={28} style={{ color: "var(--vyne-purple)" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Select a channel
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Choose a channel or DM to start messaging
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
