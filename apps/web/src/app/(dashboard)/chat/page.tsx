"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useChannels } from "@/hooks/useMessages";
import type { MsgMessage } from "@/lib/api/client";
import { ChannelSidebar } from "@/components/chat/ChannelSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { ThreadPanel } from "@/components/chat/ThreadPanel";
import { SkeletonList } from "@/components/shared/Skeleton";

export default function ChatPage() {
  const router = useRouter();
  const { channels, dms, loading } = useChannels();
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [isDM, setIsDM] = useState(false);
  const [threadMsg, setThreadMsg] = useState<MsgMessage | null>(null);

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
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "var(--content-bg)",
      }}
    >
      {/* ── Channel sidebar (or skeleton while loading) ───────── */}
      {loading && channels.length === 0 ? (
        <div
          style={{
            width: 260,
            borderRight: "1px solid var(--content-border)",
            padding: 14,
            background: "var(--content-bg)",
          }}
        >
          <SkeletonList items={6} avatarSize={20} />
        </div>
      ) : (
        <ChannelSidebar
          channels={channels}
          dms={dms}
          selectedId={selectedId}
          isDM={isDM}
          onSelectChannel={selectChannel}
          onCreateChannel={() => router.push("/chat/new")}
        />
      )}

      {/* ── Main area ─────────────────────────────────── */}
      {selectedId ? (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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
      ) : (
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
              background: "rgba(108,71,255,0.08)",
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
      )}

    </div>
  );
}
